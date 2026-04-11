import React, { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { Cog6ToothIcon, UserIcon, BellIcon, GlobeAltIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState("system");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [systemSettings, setSystemSettings] = useState({
    schoolName: "WMSU Integrated Learning System",
    schoolYear: "2024-2025",
    semester: "First Semester",
    systemMaintenance: false,
    allowRegistrations: true,
    emailNotifications: true
  });

  useEffect(() => {
    fetchUserData();
    fetchSystemSettings();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setFormData({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || ""
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await api.get("/super-admin/system-settings");
      if (response.data) {
        setSystemSettings(response.data);
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/super-admin/update-profile", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      });
      
      // Update localStorage
      const updatedUser = { ...user, firstName: formData.firstName, lastName: formData.lastName, email: formData.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingsUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/super-admin/system-settings", systemSettings);
      toast.success("System settings updated successfully");
    } catch (error) {
      console.error("Error updating system settings:", error);
      toast.error(error.response?.data?.message || "Failed to update system settings");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      setLoading(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    try {
      await api.put("/super-admin/change-password", {
        newPassword: passwordData.newPassword
      });
      
      toast.success("Password changed successfully");
      
      // Clear password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const response = await api.post("/admin/backup");
      toast.success("Backup created successfully");
      // Update last backup date
      setSystemSettings({
        ...systemSettings,
        lastBackupDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error(error.response?.data?.message || "Failed to create backup");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setLoading(true);
        try {
          const formData = new FormData();
          formData.append('backup', file);
          await api.post("/admin/restore", formData);
          toast.success("Backup restored successfully");
        } catch (error) {
          console.error("Error restoring backup:", error);
          toast.error(error.response?.data?.message || "Failed to restore backup");
        } finally {
          setLoading(false);
        }
      }
    };
    input.click();
  };

  const tabs = [
    { id: "system", name: "System", icon: Cog6ToothIcon },
    { id: "profile", name: "Profile", icon: UserIcon },
    { id: "notifications", name: "Notifications", icon: BellIcon },
    { id: "backup", name: "Backup", icon: DocumentTextIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full">
            <Cog6ToothIcon className="w-8 h-8 text-red-800" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and system settings</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "border-red-800 text-red-800"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* System Tab */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h2>
                <form onSubmit={handleSystemSettingsUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">School Name</label>
                      <input
                        type="text"
                        value={systemSettings.schoolName}
                        onChange={(e) => setSystemSettings({...systemSettings, schoolName: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">School Year</label>
                      <input
                        type="text"
                        value={systemSettings.schoolYear}
                        onChange={(e) => setSystemSettings({...systemSettings, schoolYear: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quarter</label>
                      <select
                        value={systemSettings.quarter || "First Quarter"}
                        onChange={(e) => setSystemSettings({...systemSettings, quarter: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="First Quarter">First Quarter</option>
                        <option value="Second Quarter">Second Quarter</option>
                        <option value="Third Quarter">Third Quarter</option>
                        <option value="Fourth Quarter">Fourth Quarter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">System Version</label>
                      <input
                        type="text"
                        value={systemSettings.systemVersion || "2.0.0"}
                        onChange={(e) => setSystemSettings({...systemSettings, systemVersion: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g., 2.0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max File Upload Size (MB)</label>
                      <input
                        type="number"
                        value={systemSettings.maxFileSize || 10}
                        onChange={(e) => setSystemSettings({...systemSettings, maxFileSize: parseInt(e.target.value)})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={systemSettings.sessionTimeout || 30}
                        onChange={(e) => setSystemSettings({...systemSettings, sessionTimeout: parseInt(e.target.value)})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        min="5"
                        max="480"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">System Controls</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="maintenance"
                          checked={systemSettings.systemMaintenance}
                          onChange={(e) => setSystemSettings({...systemSettings, systemMaintenance: e.target.checked})}
                          className="h-4 w-4 text-red-800 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="maintenance" className="ml-2 block text-sm text-gray-700">
                          Enable System Maintenance Mode
                          <span className="block text-xs text-gray-500">Will prevent non-admin users from accessing the system</span>
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="registrations"
                          checked={systemSettings.allowRegistrations}
                          onChange={(e) => setSystemSettings({...systemSettings, allowRegistrations: e.target.checked})}
                          className="h-4 w-4 text-red-800 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="registrations" className="ml-2 block text-sm text-gray-700">
                          Allow New User Registrations
                          <span className="block text-xs text-gray-500">Users can register for new accounts</span>
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          checked={systemSettings.emailNotifications}
                          onChange={(e) => setSystemSettings({...systemSettings, emailNotifications: e.target.checked})}
                          className="h-4 w-4 text-red-800 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                          Enable Email Notifications
                          <span className="block text-xs text-gray-500">Send system notifications via email</span>
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="debugMode"
                          checked={systemSettings.debugMode || false}
                          onChange={(e) => setSystemSettings({...systemSettings, debugMode: e.target.checked})}
                          className="h-4 w-4 text-red-800 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="debugMode" className="ml-2 block text-sm text-gray-700">
                          Enable Debug Mode
                          <span className="block text-xs text-gray-500">Show detailed error messages and logs</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Academic Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Grading Period</label>
                        <select
                          value={systemSettings.gradingPeriod || "Quarterly"}
                          onChange={(e) => setSystemSettings({...systemSettings, gradingPeriod: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="Quarterly">Quarterly</option>
                          <option value="Semestral">Semestral</option>
                          <option value="Trimestral">Trimestral</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Passing Grade</label>
                        <input
                          type="number"
                          value={systemSettings.passingGrade || 75}
                          onChange={(e) => setSystemSettings({...systemSettings, passingGrade: parseInt(e.target.value)})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="50"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Updating..." : "Update Settings"}
                    </button>
                  </div>
                </form>
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
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
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
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? "Changing..." : "Change Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-500">Receive email notifications for system events</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings({...systemSettings, emailNotifications: !systemSettings.emailNotifications})}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        systemSettings.emailNotifications ? 'bg-red-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        systemSettings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">User Registration Alerts</h3>
                      <p className="text-sm text-gray-500">Get notified when new users register</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings({...systemSettings, userRegistrationAlerts: !systemSettings.userRegistrationAlerts})}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        systemSettings.userRegistrationAlerts ? 'bg-red-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        systemSettings.userRegistrationAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">System Error Reports</h3>
                      <p className="text-sm text-gray-500">Receive notifications for system errors</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings({...systemSettings, systemErrorReports: !systemSettings.systemErrorReports})}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        systemSettings.systemErrorReports ? 'bg-red-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        systemSettings.systemErrorReports ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Backup Reminders</h3>
                      <p className="text-sm text-gray-500">Get reminded about scheduled backups</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings({...systemSettings, backupReminders: !systemSettings.backupReminders})}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        systemSettings.backupReminders ? 'bg-red-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        systemSettings.backupReminders ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notification Email</label>
                    <input
                      type="email"
                      value={user?.email || "superadmin@wmsu.edu.ph"}
                      onChange={(e) => setUser({...user, email: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      placeholder="superadmin@wmsu.edu.ph"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notification Frequency</label>
                    <select
                      value={systemSettings.notificationFrequency || "Daily"}
                      onChange={(e) => setSystemSettings({...systemSettings, notificationFrequency: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="Real-time">Real-time</option>
                      <option value="Daily">Daily Digest</option>
                      <option value="Weekly">Weekly Summary</option>
                      <option value="Monthly">Monthly Report</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">System Update Completed</p>
                        <p className="text-sm text-gray-500">WMSU ILS has been successfully updated to version 2.0.0</p>
                        <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">New User Registration</p>
                        <p className="text-sm text-gray-500">5 new teachers have registered for accounts</p>
                        <p className="text-xs text-gray-400 mt-1">4 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">Backup Scheduled</p>
                        <p className="text-sm text-gray-500">Monthly system backup is scheduled for tomorrow</p>
                        <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSystemSettingsUpdate}
                  disabled={loading}
                  className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Save Notification Settings"}
                </button>
              </div>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">System Backup</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Last Backup</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>{systemSettings.lastBackupDate ? new Date(systemSettings.lastBackupDate).toLocaleString() : "No backup data available"}</p>
                          <p className="text-xs mt-1">Next automatic backup: {systemSettings.nextBackupDate ? new Date(systemSettings.nextBackupDate).toLocaleString() : "Not scheduled"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Backup Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
                        <select
                          value={systemSettings.backupFrequency || "Weekly"}
                          onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Manual">Manual Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Backup Retention (days)</label>
                        <input
                          type="number"
                          value={systemSettings.backupRetention || 30}
                          onChange={(e) => setSystemSettings({...systemSettings, backupRetention: parseInt(e.target.value)})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="7"
                          max="365"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoBackup"
                          checked={systemSettings.autoBackup || false}
                          onChange={(e) => setSystemSettings({...systemSettings, autoBackup: e.target.checked})}
                          className="h-4 w-4 text-red-800 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="autoBackup" className="ml-2 block text-sm text-gray-700">
                          Enable Automatic Backups
                          <span className="block text-xs text-gray-500">System will create backups automatically based on frequency</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleCreateBackup}
                      disabled={loading}
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Creating..." : "Create Backup Now"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreBackup}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Restore Backup
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSystemSettingsUpdate}
                  disabled={loading}
                  className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Save Backup Settings"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
