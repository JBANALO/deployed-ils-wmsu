import React, { useState, useEffect } from "react";
import {
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ClockIcon,
  GlobeAltIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";
import { useAuth } from "../../context/UserContext";

export default function AdminSettings() {
  const { adminUser } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);

  const [settings, setSettings] = useState({
    siteName: "WMSU ILS-Elementary Department",
    siteDescription:
      "Automated Grades Portal and Students Attendance using QR Code",
    adminEmail: adminUser?.email || "",
    allowRegistration: true,
    requireApproval: true,
    sessionTimeout: "30",
    maintenance: false,
    notifications: {
      email: true,
    },
    backup: {
      enabled: true,
      frequency: "daily",
      lastBackup: null,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [backupHistory, setBackupHistory] = useState([]);

  // Profile related state
  const [formData, setFormData] = useState({
    firstName: adminUser?.firstName || "",
    lastName: adminUser?.lastName || "",
    email: adminUser?.email || "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
    verificationCode: "",
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingPasswordVerification, setIsSendingPasswordVerification] = useState(false);
  const [passwordVerificationSent, setPasswordVerificationSent] = useState(false);

  // ✅ FIXED INPUT HANDLER
  const handleInputChange = (key, value, nestedKey = null) => {
    setSettings((prev) => {
      if (nestedKey) {
        return {
          ...prev,
          [key]: {
            ...prev[key],
            [nestedKey]: value,
          },
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  useEffect(() => {
    fetchSettings();
    fetchBackupHistory();
  }, []);

  // Fetch current admin user data to get correct email
  useEffect(() => {
    const fetchCurrentAdmin = async () => {
      if (adminUser?.email) {
        setSettings(prev => ({
          ...prev,
          adminEmail: adminUser.email
        }));
      } else {
        // Fallback: fetch current user data
        try {
          const response = await api.get('/auth/me');
          if (response.data?.data?.user?.email) {
            setSettings(prev => ({
              ...prev,
              adminEmail: response.data.data.user.email
            }));
          }
        } catch (error) {
          console.error('Error fetching current admin:', error);
        }
      }
    };

    fetchCurrentAdmin();
  }, [adminUser]);

  // Sync admin email with current logged-in admin
  useEffect(() => {
    if (adminUser?.email) {
      setSettings(prev => ({
        ...prev,
        adminEmail: adminUser.email
      }));
    }
  }, [adminUser?.email]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      // Preserve current admin email from logged-in user
      setSettings(prev => ({
        ...response.data,
        adminEmail: adminUser?.email || prev.adminEmail || response.data.adminEmail
      }));
      setInitialSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupHistory = async () => {
    try {
      const response = await api.get('/admin/backup/history');
      setBackupHistory(response.data.backups || []);
    } catch (error) {
      console.error('Error fetching backup history:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/admin/settings', settings);
      setInitialSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      const response = await api.post('/admin/backup');
      toast.success(`Backup created: ${response.data.filename}`);
      
      // Update last backup timestamp
      if (response.data.timestamp) {
        setSettings(prev => ({
          ...prev,
          backup: {
            ...prev.backup,
            lastBackup: response.data.timestamp
          }
        }));
      }
      
      // Refresh backup history
      fetchBackupHistory();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error(error.response?.data?.message || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async (type) => {
    try {
      setLoading(true);
      await api.post('/admin/test-notification', {
        type,
        recipient: adminUser?.email || settings.adminEmail
      });
      
      toast.success(`Test ${type} notification sent successfully!`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!initialSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  };

  // Profile handlers
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/admin/profile', formData);
      toast.success('Profile updated successfully!');
      // Update adminUser in context if needed
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!passwordVerificationSent) {
      toast.error('Please send verification first');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!passwordData.verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    const email = adminUser?.email || formData.email;
    if (!email) {
      toast.error('Email not found in your profile');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Verify the code first
      const verifyResponse = await api.post('/auth/verify-code', {
        email,
        code: passwordData.verificationCode
      });

      if (verifyResponse.data.message !== 'Verification successful') {
        toast.error(verifyResponse.data.message || 'Invalid or expired verification code');
        return;
      }

      // Change password
      await api.put('/auth/change-password', {
        newPassword: passwordData.newPassword
      });

      toast.success('Password changed successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '', verificationCode: '' });
      setPasswordVerificationSent(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendPasswordVerification = async () => {
    const email = adminUser?.email || formData.email;
    if (!email) {
      toast.error('Email not found in your profile');
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast.error('Please enter a new password (at least 6 characters)');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSendingPasswordVerification(true);
    try {
      await api.post('/auth/send-verification', {
        email
      });
      toast.success('Verification email sent successfully!');
      setPasswordVerificationSent(true);
    } catch (error) {
      console.error('Error sending verification:', error);
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    } finally {
      setIsSendingPasswordVerification(false);
    }
  };

  const notificationOptions = [
    {
      key: "email",
      label: "Email Notifications",
      icon: DocumentTextIcon,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4">
          <Cog6ToothIcon className="w-12 h-12 text-red-800" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              System Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your WMSU ILS system preferences
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "general", label: "General", icon: Cog6ToothIcon },
              { id: "profile", label: "Profile", icon: UserIcon },
              { id: "security", label: "Security", icon: LockClosedIcon },
              { id: "notifications", label: "Notifications", icon: BellIcon },
              { id: "backup", label: "Backup", icon: DocumentTextIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-red-800 text-red-800"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={(e) =>
                        handleInputChange("siteName", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                    <input
                      type="email"
                      value={settings.adminEmail}
                      onChange={(e) =>
                        handleInputChange("adminEmail", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label>
                  <textarea
                    value={settings.siteDescription}
                    onChange={(e) =>
                      handleInputChange("siteDescription", e.target.value)
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Allow Registration */}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Allow Registration</span>
                  <button
                    onClick={() =>
                      handleInputChange(
                        "allowRegistration",
                        !settings.allowRegistration
                      )
                    }
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                      settings.allowRegistration ? 'bg-red-800' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                      settings.allowRegistration ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Require Approval */}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Require Approval</span>
                  <button
                    onClick={() =>
                      handleInputChange(
                        "requireApproval",
                        !settings.requireApproval
                      )
                    }
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                      settings.requireApproval ? 'bg-red-800' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                      settings.requireApproval ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout</label>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    handleInputChange("sessionTimeout", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                <button
                  onClick={() =>
                    handleInputChange(
                      "maintenance",
                      !settings.maintenance
                    )
                  }
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    settings.maintenance ? 'bg-red-800' : 'bg-gray-200'
                  }`}
                >
                  <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    settings.maintenance ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  {notificationOptions.map((n) => (
                    <div
                      key={n.key}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <n.icon className={`w-5 h-5 ${n.color}`} />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{n.label}</h4>
                          <p className="text-xs text-gray-500">
                            {n.key === 'email' && 'Receive email notifications for system events'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestNotification(n.key)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          Test
                        </button>
                        <button
                          onClick={() =>
                            handleInputChange(
                              "notifications",
                              !settings.notifications[n.key],
                              n.key
                            )
                          }
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                            settings.notifications[n.key] ? 'bg-red-800' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            settings.notifications[n.key] ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? "Updating..." : "Update Profile"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => {
                          setPasswordData({...passwordData, newPassword: e.target.value});
                          setPasswordVerificationSent(false);
                        }}
                        className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                    <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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

                  {passwordVerificationSent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verification Code</label>
                      <input
                        type="text"
                        value={passwordData.verificationCode}
                        onChange={(e) => setPasswordData({...passwordData, verificationCode: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        required
                        placeholder="Enter 6-digit code"
                        maxLength="6"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
                    </div>
                  )}

                  {passwordVerificationSent && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-800">✓ Verification email sent. Please check your inbox and enter the code above.</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleSendPasswordVerification}
                      disabled={isSendingPasswordVerification || passwordVerificationSent}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSendingPasswordVerification ? "Sending..." : passwordVerificationSent ? "Verification Sent" : "Send Verification"}
                    </button>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isChangingPassword || !passwordVerificationSent}
                        className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {isChangingPassword ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* BACKUP */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Backup Frequency</label>
                    <select
                      value={settings.backup.frequency}
                      onChange={(e) =>
                        handleInputChange("backup", e.target.value, "frequency")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Auto Backup</span>
                      <p className="text-xs text-gray-500">Automatically create backups at scheduled intervals</p>
                    </div>
                    <button
                      onClick={() =>
                        handleInputChange(
                          "backup",
                          !settings.backup.enabled,
                          "enabled"
                        )
                      }
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        settings.backup.enabled ? 'bg-red-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        settings.backup.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-blue-900">Last Backup</p>
                        <p className="text-sm text-blue-600">
                          {(() => {
                            if (!settings.backup.lastBackup) {
                              return 'No backup performed yet';
                            }
                            try {
                              // Fix the invalid timestamp format by replacing dashes with colons
                              let cleanTimestamp = settings.backup.lastBackup;
                              if (cleanTimestamp.includes('T') && cleanTimestamp.includes('-')) {
                                cleanTimestamp = cleanTimestamp.replace(/T(\d+)-(\d+)-(\d+)/, 'T$1:$2:$3');
                              }
                              const date = new Date(cleanTimestamp);
                              return isNaN(date.getTime()) 
                                ? 'Invalid date' 
                                : date.toLocaleString();
                            } catch (error) {
                              return 'Invalid date';
                            }
                          })()}
                        </p>
                      </div>
                      <button 
                        onClick={handleBackup}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <ClockIcon className="w-4 h-4" />
                        {loading ? 'Creating...' : 'Backup Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup History</h3>
                {backupHistory.length > 0 ? (
                  <div className="space-y-2">
                    {backupHistory.map((backup, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{backup.filename}</p>
                          <p className="text-xs text-gray-500">
                            Created: {(() => {
                              try {
                                const date = new Date(backup.created);
                                return isNaN(date.getTime()) 
                                  ? 'Invalid date' 
                                  : date.toLocaleString();
                              } catch {
                                return 'Invalid date';
                              }
                            })()} • 
                            Size: {(backup.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">No backup history available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
