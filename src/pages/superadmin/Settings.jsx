import React, { useState, useEffect } from "react";
import { Cog6ToothIcon, UserIcon, BellIcon, ShieldCheckIcon, GlobeAltIcon, KeyIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [systemSettings, setSystemSettings] = useState({
    schoolName: "WMSU Integrated Learning System",
    schoolYear: "2024-2025",
    semester: "First Semester",
    systemMaintenance: false,
    allowRegistrations: true,
    emailNotifications: true,
    smsNotifications: false
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
        email: userData.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await api.get("/api/admin/system-settings");
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
      await api.put("/api/admin/update-profile", {
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      await api.put("/api/admin/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      toast.success("Password changed successfully");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingsUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/api/admin/system-settings", systemSettings);
      toast.success("System settings updated successfully");
    } catch (error) {
      console.error("Error updating system settings:", error);
      toast.error(error.response?.data?.message || "Failed to update system settings");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "profile", name: "Profile", icon: UserIcon },
    { id: "security", name: "Security", icon: ShieldCheckIcon },
    { id: "system", name: "System", icon: Cog6ToothIcon },
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
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Updating..." : "Update Profile"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      required
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      required
                      value={formData.newPassword}
                      onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Updating..." : "Change Password"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <KeyIcon className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">2FA Not Enabled</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Enable two-factor authentication for enhanced security.</p>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
                        >
                          Enable 2FA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      <label className="block text-sm font-medium text-gray-700">Semester</label>
                      <select
                        value={systemSettings.semester}
                        onChange={(e) => setSystemSettings({...systemSettings, semester: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="First Semester">First Semester</option>
                        <option value="Second Semester">Second Semester</option>
                        <option value="Summer">Summer</option>
                      </select>
                    </div>
                  </div>

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
                      </label>
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
                      <h3 className="text-sm font-medium text-gray-900">SMS Notifications</h3>
                      <p className="text-sm text-gray-500">Receive SMS notifications for urgent alerts</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings({...systemSettings, smsNotifications: !systemSettings.smsNotifications})}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        systemSettings.smsNotifications ? 'bg-red-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        systemSettings.smsNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification History</h3>
                <div className="text-center py-8 text-gray-500">
                  <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No recent notifications</p>
                </div>
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
                          <p>No backup data available</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Create Backup
                    </button>
                    <button
                      type="button"
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Restore Backup
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Export All Users</span>
                      <span className="text-xs text-gray-500">CSV</span>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Export System Logs</span>
                      <span className="text-xs text-gray-500">TXT</span>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Export Academic Records</span>
                      <span className="text-xs text-gray-500">PDF</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
