import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BellIcon, UserCircleIcon, ChevronDownIcon, 
  CheckCircleIcon, XCircleIcon, UserPlusIcon, ExclamationTriangleIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import { toast } from 'react-toastify';
import { UserContext } from "../../context/UserContext";

const API_BASE = import.meta.env.VITE_API_URL;

export default function SuperAdminTopbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { adminUser, profileImageFile } = useContext(UserContext);
  const navigate = useNavigate();

  // Refs for click outside detection
  const notificationsRef = useRef(null);
  const dropdownRef = useRef(null);

  // Navigation handlers
  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastAdminEmail');
    localStorage.removeItem('lastTeacherEmail');
    localStorage.removeItem('lastStudentEmail');
    
    // Navigate to login
    navigate("/login");
  };
  const handleDashboard = () => navigate("/admin/super-admin");
  const handleTeachers = () => navigate("/admin/admin-teachers");
  const handleStudents = () => navigate("/admin/admin-students");
  const handleAdminProfile = () => navigate("/admin/super-profile");

  // Add a notification
  const addNotification = (type, title, message, data = {}) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      ...data
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the buttons themselves
      const target = event.target;
      const isNotificationButton = target.closest('[aria-label="Notifications"]');
      const isUserMenuButton = target.closest('[aria-label="User menu"]');
      
      if (isNotificationButton || isUserMenuButton) {
        return;
      }
      
      // Close notifications if clicking outside
      if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      
      // Close user dropdown if clicking outside
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showDropdown]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/super-admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && Array.isArray(response.data.notifications)) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.notifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <UserPlusIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 z-20">
      <div className="flex items-center justify-between px-6 py-4 h-16">
        <div className="flex items-center gap-3">
          <img src="/wmsu-logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover shrink-0" />
          <h1 className="text-sm font-semibold text-gray-900">WMSU ILS - Elementary (Super Admin)</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              className="relative p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => { 
                setShowNotifications(!showNotifications); 
                setShowDropdown(false); 
              }}
              aria-label="Notifications"
            >
              <BellIcon className="w-5 h-5 md:w-6 md:h-6 text-red-800 cursor-pointer hover:scale-110 transition-all shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div ref={notificationsRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-96 overflow-hidden z-50">
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="font-semibold text-gray-700">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          markAsRead(notification.id);
                          // Handle notification action
                          if (notification.data?.action === 'approve') {
                            navigate(notification.data.userType === 'teacher' ? '/admin/admin-teachers' : '/admin/admin-students');
                          } else if (notification.data?.action === 'verify') {
                            // Navigate to login verification page
                            navigate('/admin/login-verification');
                          }
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-1">
                            {notification.type === 'account_approval' && (
                              <UserPlusIcon className="w-4 h-4 text-blue-600" />
                            )}
                            {notification.type === 'login_attempt' && (
                              <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
                            )}
                            {notification.type === 'account_approved' && (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            )}
                            {notification.type === 'account_declined' && (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-gray-500 text-sm">No notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
              aria-label="User menu"
            >
            {profileImageFile ? (
              // Newly selected file (before saving)
              <img
                src={URL.createObjectURL(profileImageFile)}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : adminUser?.profileImage ? (
              // Backend image URL
              <img
                src={
                  (() => {
                    if (adminUser.profileImage.startsWith('http')) {
                      return adminUser.profileImage;
                    }
                    // Try different URL constructions for production compatibility
                    const possibleUrls = [
                      `${API_BASE.replace(/\/api$/, '')}${adminUser.profileImage}`,
                      `${API_BASE}${adminUser.profileImage}`,
                      adminUser.profileImage.startsWith('/') ? adminUser.profileImage : `/${adminUser.profileImage}`
                    ];
                    console.log('SuperAdminTopbar - Trying image URLs:', possibleUrls);
                    return possibleUrls[0]; // Default to first option
                  })()
                }
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shrink-0"
                onError={(e) => { 
                  console.log('SuperAdminTopbar - Image failed to load, trying fallback URLs');
                  const originalSrc = e.target.src;
                  const possibleUrls = [
                    `${API_BASE}${adminUser.profileImage}`,
                    adminUser.profileImage.startsWith('/') ? adminUser.profileImage : `/${adminUser.profileImage}`,
                    '/default-avatar.jpeg'
                  ];
                  
                  // Try next URL in the list
                  const currentIndex = possibleUrls.findIndex(url => originalSrc.includes(url));
                  if (currentIndex < possibleUrls.length - 1) {
                    e.target.src = possibleUrls[currentIndex + 1];
                  } else {
                    e.target.onerror = null; 
                    e.target.src = "/default-avatar.jpeg"; 
                  }
                }}
              />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-red-800 shrink-0" />
            )}
              <ChevronDownIcon
                className={`w-4 h-4 text-red-800 hidden sm:block transition-transform duration-200 ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDropdown && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-48 text-sm z-50">
                <div className="px-4 py-2 border-b font-semibold text-gray-700">
                  {adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Super Admin Account'}
                </div>
                <ul>
                  <li onClick={handleAdminProfile} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors">Profile</li>
                  <li onClick={() => navigate("/admin/super-admin")} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors">Dashboard</li>
                  <li onClick={() => navigate("/admin/admin-accounts")} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors">Admin Accounts</li>
                  <li onClick={() => navigate("/admin/teacher-accounts")} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors">Teacher Accounts</li>
                  <li onClick={() => navigate("/admin/student-accounts")} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors">Student Accounts</li>
                  <hr className="my-1" />
                  <li onClick={handleLogout} className="px-4 py-2 text-red-800 hover:bg-red-50 cursor-pointer transition-colors">Log Out</li>
                </ul>
              </div>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-6 bg-gray-300"></div>

          {/* Settings Button */}
          <button
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => navigate("/admin/super-settings")}
            aria-label="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5 md:w-6 md:h-6 text-red-800 cursor-pointer hover:scale-110 transition-all shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
}
