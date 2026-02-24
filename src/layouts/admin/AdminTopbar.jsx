import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, UserCircleIcon, ChevronDownIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import { toast } from 'react-toastify';

export default function AdminTopbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminUser, setAdminUser] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => navigate("/login");
  const handleDashboard = () => navigate("/admin/admin-dashboard");
  const handleTeachers = () => navigate("/admin/admin-teachers");
  const handleStudents = () => navigate("/admin/admin-students");
  const handleAdminProfile = () => navigate("/admin/admin-profile");

  // Add notification function
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
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);
    
    // Show toast for important notifications
    if (type === 'login_attempt' || type === 'account_approval') {
      toast.info(`${title}: ${message}`, {
        position: 'top-right',
        autoClose: 5000,
      });
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  // Fetch pending approvals and check for login attempts
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Check for pending teachers
        const teachersRes = await axios.get('/users/pending-teachers');
        const pendingTeachers = teachersRes.data?.data?.teachers || [];
        
        // Check for pending students
        const studentsRes = await axios.get('/users/pending-students');
        const pendingStudents = studentsRes.data?.data?.students || [];
        
        // Add notifications for new pending accounts
        pendingTeachers.forEach(teacher => {
          const existingNotif = notifications.find(n => 
            n.type === 'account_approval' && 
            n.data?.userId === teacher.id && 
            n.data?.userType === 'teacher'
          );
          
          if (!existingNotif) {
            addNotification(
              'account_approval',
              'New Teacher Registration',
              `${teacher.firstName} ${teacher.lastName} is awaiting approval`,
              { userId: teacher.id, userType: 'teacher', action: 'approve' }
            );
          }
        });
        
        pendingStudents.forEach(student => {
          const existingNotif = notifications.find(n => 
            n.type === 'account_approval' && 
            n.data?.userId === student.id && 
            n.data?.userType === 'student'
          );
          
          if (!existingNotif) {
            addNotification(
              'account_approval',
              'New Student Registration',
              `${student.firstName} ${student.lastName} is awaiting approval`,
              { userId: student.id, userType: 'student', action: 'approve' }
            );
          }
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    // Initial fetch
    fetchNotifications();
    
    // Set up interval for real-time updates
    const interval = setInterval(fetchNotifications, 15000); // Check every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Listen for login attempts (this would need to be implemented with WebSocket or server-sent events)
  useEffect(() => {
    // For now, we'll simulate login attempts
    // In a real implementation, this would connect to WebSocket or use polling
    const checkLoginAttempts = async () => {
      try {
        // This endpoint would need to be created on the backend
        const response = await axios.get('/admin/recent-login-attempts');
        const loginAttempts = response.data?.attempts || [];
        
        loginAttempts.forEach(attempt => {
          const existingNotif = notifications.find(n => 
            n.type === 'login_attempt' && 
            n.data?.attemptId === attempt.id
          );
          
          if (!existingNotif && attempt.status === 'pending_verification') {
            addNotification(
              'login_attempt',
              'Login Verification Required',
              `${attempt.email} is attempting to log in - verification needed`,
              { attemptId: attempt.id, email: attempt.email, action: 'verify' }
            );
          }
        });
      } catch (error) {
        // Login attempts endpoint might not exist yet
        console.log('Login attempts endpoint not available');
      }
    };

    const interval = setInterval(checkLoginAttempts, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [notifications]);

  // Fetch current admin user data
  useEffect(() => {
    const fetchAdminUser = async () => {
      try {
        // Get current user from localStorage or make an API call
        const token = localStorage.getItem('token');
        if (token) {
          // Try to get user info from stored data first
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.role === 'admin') {
              setAdminUser(user);
              return;
            }
          }
          
          // If no stored user or not admin, fetch from API
          const response = await axios.get('/auth/me');
          if (response.data?.user?.role === 'admin') {
            setAdminUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }
      } catch (error) {
        console.error('Error fetching admin user:', error);
        // Fallback to default admin info
        setAdminUser({ firstName: 'Admin', lastName: 'User' });
      }
    };

    fetchAdminUser();

    // Listen for storage events to update profile when changed
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        const updatedUser = JSON.parse(e.newValue || '{}');
        if (updatedUser?.role === 'admin') {
          setAdminUser(updatedUser);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };

    // Simple polling for updates (more reliable than storage events)
    const pollForUpdates = () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser?.role === 'admin') {
        setAdminUser(currentUser);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollForUpdates, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Handle account approval
  const handleAccountApproval = async (userId, userType, approved) => {
    try {
      await axios.post(`/admin/${userType}s/${userId}/approve`, { approved });
      
      addNotification(
        approved ? 'account_approved' : 'account_declined',
        `Account ${approved ? 'Approved' : 'Declined'}`,
        `${userType.charAt(0).toUpperCase() + userType.slice(1)} account has been ${approved ? 'approved' : 'declined'}`,
        { userId, userType, action: 'completed' }
      );
      
      toast.success(`Account ${approved ? 'approved' : 'declined'} successfully!`);
    } catch (error) {
      toast.error(`Error ${approved ? 'approving' : 'declining'} account: ${error.message}`);
    }
  };

  // Handle login verification
  const handleLoginVerification = async (attemptId, verified) => {
    try {
      await axios.post(`/admin/verify-login/${attemptId}`, { verified });
      
      addNotification(
        'login_verified',
        'Login Verification',
        `Login attempt has been ${verified ? 'approved' : 'rejected'}`,
        { attemptId, action: 'verified' }
      );
      
      toast.success(`Login ${verified ? 'verified' : 'rejected'} successfully!`);
    } catch (error) {
      toast.error(`Error verifying login: ${error.message}`);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 z-20">
      <div className="flex items-center justify-between px-6 py-4 h-16">
        <div className="flex items-center gap-3">
          <img
            src="/wmsu-logo.jpg"
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <h1 className="text-sm font-semibold text-gray-900">
            WMSU ILS - Elementary (Admin)
          </h1>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
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
              <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-96 overflow-hidden z-50">
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
                          <div className="flex-shrink-0 mt-1">
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
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
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
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              aria-label="User menu"
            >
              {adminUser?.profileImage ? (
                <img
                  src={adminUser.profileImage}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover shrink-0"
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
              <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-48 text-sm z-50">
                <div className="px-4 py-2 border-b font-semibold text-gray-700">
                {adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin Account'}
              </div>
                <ul>
                  <li 
                    onClick={handleAdminProfile}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Admin Profile
                  </li>
                  <li 
                    onClick={handleDashboard}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Dashboard
                  </li>
                  <li 
                    onClick={handleTeachers}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Manage Teachers
                  </li>
                  <li 
                    onClick={handleStudents}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Manage Students
                  </li>
                  <hr className="my-1" />
                  <li
                    onClick={handleLogout}
                    className="px-4 py-2 text-red-800 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    Log Out
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
