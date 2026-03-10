const pool = require('../config/db');

let supportTableReady = false;
const ensureSupportTable = async () => {
  if (supportTableReady) return;
  const createTableSQL = `CREATE TABLE IF NOT EXISTS support_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_name VARCHAR(150) NOT NULL,
    sender_email VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_support_status (status),
    INDEX idx_support_read (is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;
  await pool.query(createTableSQL);
  supportTableReady = true;
};

const withSupportTable = async (fn) => {
  try {
    await ensureSupportTable();
    return await fn();
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      supportTableReady = false;
      await ensureSupportTable();
      return await fn();
    }
    throw error;
  }
};

const mapSupportMessage = (row) => ({
  id: row.id,
  name: row.sender_name,
  email: row.sender_email,
  message: row.message,
  status: row.status,
  isRead: !!row.is_read,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const createSupportMessage = async (req, res) => {
  try {
    await ensureSupportTable();
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name, email, and message are required.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO support_messages (sender_name, sender_email, message)
       VALUES (?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), message.trim()]
    );

    const insertedId = result.insertId;
    const [[newMessage]] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [insertedId]);

    res.status(201).json({
      status: 'success',
      message: 'Support message submitted successfully.',
      data: { supportMessage: mapSupportMessage(newMessage) }
    });
  } catch (error) {
    console.error('createSupportMessage error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit support message.' });
  }
};

const getSupportMessages = async (req, res) => {
  try {
    await ensureSupportTable();
    const { status, is_read, senderEmail, limit = 50 } = req.query;
    const params = [];
    let query = 'SELECT * FROM support_messages WHERE 1=1';

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (typeof is_read !== 'undefined') {
      query += ' AND is_read = ?';
      params.push(is_read === '1' || is_read === 'true' ? 1 : 0);
    }

    if (senderEmail) {
      query += ' AND sender_email = ?';
      params.push(senderEmail.toLowerCase());
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(query, params);

    res.json({
      status: 'success',
      data: { messages: rows.map(mapSupportMessage) }
    });
  } catch (error) {
    console.error('getSupportMessages error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch support messages.' });
  }
};

const updateSupportMessage = async (req, res) => {
  try {
    await ensureSupportTable();
    const { id } = req.params;
    const { status, isRead } = req.body;

    if (!id) {
      return res.status(400).json({ status: 'fail', message: 'Message ID is required.' });
    }

    const fields = [];
    const params = [];

    if (typeof status !== 'undefined') {
      fields.push('status = ?');
      params.push(status);
    }

    if (typeof isRead !== 'undefined') {
      fields.push('is_read = ?');
      params.push(isRead ? 1 : 0);
    }

    if (!fields.length) {
      return res.status(400).json({ status: 'fail', message: 'No updates provided.' });
    }

    params.push(id);
    await pool.query(`UPDATE support_messages SET ${fields.join(', ')} WHERE id = ?`, params);

    const [[updated]] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Support message updated.',
      data: { supportMessage: mapSupportMessage(updated) }
    });
  } catch (error) {
    console.error('updateSupportMessage error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update support message.' });
  }
};

module.exports = {
  createSupportMessage,
  getSupportMessages,
  updateSupportMessage
};
