const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const verifyUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-fallback');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

let notificationsEnsured = false;
const ensureNotificationsTable = async () => {
  if (notificationsEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      meta_json JSON NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user_created (user_id, created_at),
      INDEX idx_notifications_user_unread (user_id, is_read)
    )
  `);
  notificationsEnsured = true;
};

router.get('/', verifyUser, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = String(req.user?.userId || req.user?.id || '').trim();
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User not found in token' });
    }

    const limit = Math.max(1, Math.min(Number(req.query.limit || 20), 100));

    const rows = await query(
      `SELECT id, type, title, message, meta_json, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    const unreadRows = await query(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    const items = rows.map((row) => ({
      ...row,
      is_read: Number(row.is_read) === 1,
      meta: row.meta_json ? (() => {
        try {
          return JSON.parse(row.meta_json);
        } catch (_) {
          return null;
        }
      })() : null
    }));

    return res.json({
      success: true,
      data: {
        items,
        unreadCount: Number(unreadRows?.[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', verifyUser, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = String(req.user?.userId || req.user?.id || '').trim();
    const notificationId = Number(req.params.id);

    if (!userId || !Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const result = await query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

module.exports = router;
