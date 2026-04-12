import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, UserCircleIcon, ChevronDownIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import api from "../../api/axiosConfig";
import { UserContext } from "../../context/UserContext";

export default function TeacherTopbar({ sidebarOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { logout } = useContext(UserContext);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const fullName = `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || user.name || user.email || "User";
        setUserName(fullName);
      }
    } catch (error) {
      console.error("Failed to read user from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    let timer = null;

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        const items = response.data?.data?.items || [];
        const unread = Number(response.data?.data?.unreadCount || 0);
        setNotifications(items);
        setUnreadCount(unread);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    fetchNotifications();
    timer = setInterval(fetchNotifications, 15000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications);
    setShowDropdown(false);

    // Mark unread as read when opening dropdown.
    if (!showNotifications) {
      const unreadItems = notifications.filter((item) => !item.is_read);
      if (unreadItems.length > 0) {
        try {
          await Promise.all(unreadItems.map((item) => api.put(`/notifications/${item.id}/read`)));
          setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
          setUnreadCount(0);
        } catch (error) {
          console.error('Failed to mark notifications as read:', error);
        }
      }
    }
  };

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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showDropdown]);

  const handleLogout = () => {
    // Use UserContext logout to clear user data properly
    logout();
    
    // Clear authentication tokens
    localStorage.removeItem('token');
    localStorage.removeItem('lastAdminEmail');
    localStorage.removeItem('lastTeacherEmail');
    localStorage.removeItem('lastStudentEmail');
    
    // Navigate to login
    navigate("/login");
  };
  const handleMainDashboard = () => navigate("/teacher/teacher-dashboard");
  const handleProfile = () => navigate("/teacher/teacher-profile");
  const handleGradesPortal = () => navigate("/edit-grades");
  const handleAttendancePage = () => navigate("/qr-portal");
  const handleChangePassword = () => {
    setShowDropdown(false);
    setShowPasswordModal(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.put('/teacher/password', { 
        newPassword: passwordData.newPassword 
      });
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-16 bg-white shadow flex items-center justify-between px-8 border-b border-gray-200 z-20 transition-all duration-500 ease-in-out ${
          sidebarOpen ? "left-64" : "left-20"
        }`}
      >
        <div className="flex items-center">
          <img
            src="/wmsu-logo.jpg"
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover"
          />
          <h1 className="text-sm font-semibold leading-tight pl-3">
            WMSU ILS - Elementary Department
          </h1>
        </div>

        <div className="flex items-center gap-6 relative">
          {/* Notification Bell */}
          <div className="relative">
            <button
              className="relative p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handleOpenNotifications}
              aria-label="Notifications"
            >
              <BellIcon className="w-5 h-5 md:w-6 md:h-6 text-red-800 cursor-pointer hover:scale-110 transition-all shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div ref={notificationsRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-96 overflow-hidden z-50">
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="font-semibold text-gray-700">Notifications</h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-gray-500 text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div key={item.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                        <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{item.message}</p>
                        <p className="text-[11px] text-gray-400 mt-2">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* User Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
              aria-label="User menu"
            >
              <UserCircleIcon className="w-8 h-8 text-red-800" />
              <ChevronDownIcon className={`w-4 h-4 text-red-800 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-56 text-sm z-10 animate-fadeIn">
                <div className="px-4 py-2 border-b font-semibold">
                  {userName || "Loading..."}
                </div>
                <ul>
                  <li 
                    onClick={handleMainDashboard}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Dashboard
                  </li>
                  <li 
                    onClick={handleProfile}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Profile
                  </li>
                  <li 
                    onClick={handleChangePassword}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Change Account Password
                  </li>
                  <li 
                    onClick={handleGradesPortal}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Edit Grades
                  </li>
                  <li 
                    onClick={handleAttendancePage}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    QR Code Portal
                  </li>
                  <hr />
                  <li
                    onClick={handleLogout}
                    className="px-4 py-2 text-red-800 hover:bg-gray-100 cursor-pointer"
                  >
                    Log Out
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Account Password</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                      minLength="6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showNewPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                      minLength="6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isChangingPassword ? "Changing..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}