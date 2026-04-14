import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

class NotificationService {
  constructor() {
    this.listeners = new Map();
    this.notifications = new Map();
    this.unreadCounts = new Map();
    this.realTimeInterval = null;
  }

  // Initialize notification service for a user
  async initialize(userId, role) {
    try {
      const response = await api.get('/notifications');
      const items = response.data?.data?.items || [];
      const unread = Number(response.data?.data?.unreadCount || 0);
      
      this.notifications.set(userId, items);
      this.unreadCounts.set(userId, unread);
      
      // Start real-time polling
      this.startRealTimeUpdates(userId, role);
      
      return { items, unread };
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return { items: [], unread: 0 };
    }
  }

  // Start real-time updates
  startRealTimeUpdates(userId, role) {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }

    // Auto-refresh polling is disabled; notifications now update on explicit fetch actions.
    void userId;
    void role;
  }

  // Fetch latest notifications
  async fetchLatestNotifications(userId, role) {
    try {
      const response = await api.get('/notifications/latest');
      const newNotifications = response.data?.data || [];
      
      if (newNotifications.length > 0) {
        const currentNotifications = this.notifications.get(userId) || [];
        const combined = this.mergeNotifications(currentNotifications, newNotifications, role);
        
        this.notifications.set(userId, combined);
        this.notifyListeners(userId, combined);
        
        // Show toast for critical notifications only
        newNotifications.forEach(notif => {
          if (this.isCriticalNotification(notif, role)) {
            this.showToast(notif);
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch latest notifications:', error);
    }
  }

  // Merge notifications avoiding duplicates
  mergeNotifications(current, newNotifications, role) {
    const existingIds = new Set(current.map(n => n.id));
    const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
    
    // Consolidate similar events
    const consolidated = this.consolidateNotifications([...uniqueNew, ...current], role);
    
    // Keep only last 50 notifications
    return consolidated.slice(0, 50);
  }

  // Consolidate similar notifications to prevent spam
  consolidateNotifications(notifications, role) {
    const consolidated = [];
    const seen = new Map();

    notifications.forEach(notif => {
      const key = this.getConsolidationKey(notif, role);
      
      if (seen.has(key)) {
        // Update existing notification with count
        const existing = seen.get(key);
        existing.count = (existing.count || 1) + 1;
        existing.latestTimestamp = notif.timestamp;
        if (notif.priority === 'critical') {
          existing.priority = 'critical';
        }
      } else {
        // Add new notification
        seen.set(key, {
          ...notif,
          count: 1,
          latestTimestamp: notif.timestamp
        });
        consolidated.push(seen.get(key));
      }
    });

    return consolidated.sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { critical: 0, important: 1, info: 2 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return new Date(b.latestTimestamp || b.timestamp) - new Date(a.latestTimestamp || a.timestamp);
    });
  }

  // Get consolidation key for similar notifications
  getConsolidationKey(notif, role) {
    const { type, category } = notif;
    return `${role}-${type}-${category}`;
  }

  // Check if notification is critical
  isCriticalNotification(notif, role) {
    return notif.priority === 'critical' || 
           (notif.category === 'security' && role === 'super_admin') ||
           (notif.category === 'system' && role === 'super_admin');
  }

  // Show toast notification
  showToast(notif) {
    const message = notif.count > 1 
      ? `${notif.title} (${notif.count} new events)`
      : notif.title;
    
    const toastType = notif.priority === 'critical' ? 'error' : 
                     notif.priority === 'important' ? 'warning' : 'info';
    
    toast[toastType](message, {
      position: "top-right",
      autoClose: notif.priority === 'critical' ? 10000 : 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Add notification listener
  addListener(userId, callback) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, []);
    }
    this.listeners.get(userId).push(callback);
  }

  // Remove notification listener
  removeListener(userId, callback) {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      const index = userListeners.indexOf(callback);
      if (index > -1) {
        userListeners.splice(index, 1);
      }
    }
  }

  // Notify all listeners for a user
  notifyListeners(userId, notifications) {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.forEach(callback => callback(notifications));
    }
  }

  // Get notifications for a user
  getNotifications(userId) {
    return this.notifications.get(userId) || [];
  }

  // Get unread count for a user
  getUnreadCount(userId) {
    return this.unreadCounts.get(userId) || 0;
  }

  // Mark notification as read
  async markAsRead(userId, notificationId) {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      
      const notifications = this.notifications.get(userId) || [];
      const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      
      this.notifications.set(userId, updated);
      this.notifyListeners(userId, updated);
      
      // Update unread count
      const unread = updated.filter(n => !n.is_read).length;
      this.unreadCounts.set(userId, unread);
      
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      await api.put('/notifications/read-all');
      
      const notifications = this.notifications.get(userId) || [];
      const updated = notifications.map(n => ({ ...n, is_read: true }));
      
      this.notifications.set(userId, updated);
      this.unreadCounts.set(userId, 0);
      this.notifyListeners(userId, updated);
      
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }

  // Create notification (for system events)
  async createNotification(notificationData) {
    try {
      await api.post('/notifications', notificationData);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  // Cleanup
  cleanup(userId) {
    this.listeners.delete(userId);
    this.notifications.delete(userId);
    this.unreadCounts.delete(userId);
  }

  // Stop real-time updates
  stopRealTimeUpdates() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
