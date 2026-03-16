import React, { useState, useEffect } from "react";
import { Cog6ToothIcon, UserIcon, BellIcon, ShieldCheckIcon, KeyIcon, DocumentTextIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";

export default function TeacherSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    employeeId: "",
    contactNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [notificationSettings, setNotificationSettings] = useState({
    gradeUpdates: true,
    attendanceAlerts: true,
    parentMessages: true,
    systemNotifications: false,
    emailNotifications: true,
    smsNotifications: false
  });

  useEffect(() => {
    fetchUserData();
    fetchNotificationSettings();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setFormData({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        department: userData.department || "",
        employeeId: userData.employeeId || "",
        contactNumber: userData.contactNumber || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await api.get("/api/teacher/notification-settings");
      if (response.data) {
        setNotificationSettings(response.data);
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/api/teacher/update-profile", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        department: formData.department,
        employeeId: formData.employeeId,
        contactNumber: formData.contactNumber
      });
      
      // Update localStorage
      const updatedUser = { 
        ...user, 
        firstName: formData.firstName, 
        lastName: formData.lastName, 
        email: formData.email,
        department: formData.department,
        employeeId: formData.employeeId,
        contactNumber: formData.contactNumber
      };
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
      await api.put("/api/teacher/change-password", {
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

  const handleNotificationSettingsUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/api/teacher/notification-settings", notificationSettings);
      toast.success("Notification settings updated successfully");
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast.error(error.response?.data?.message || "Failed to update notification settings");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "profile", name: "Profile", icon: UserIcon },
    { id: "security", name: "Security", icon: ShieldCheckIcon },
    { id: "notifications", name: "Notifications", icon: BellIcon },
    { id: "academic", name: "Academic", icon: AcademicCapIcon }
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
            <p className="text-gray-600">Manage your teacher profile and preferences</p>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                      <input
                        type="text"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
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

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                <form onSubmit={handleNotificationSettingsUpdate} className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Grade Updates</h3>
                        <p className="text-sm text-gray-500">Get notified when grades are updated</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationSettings({...notificationSettings, gradeUpdates: !notificationSettings.gradeUpdates})}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                          notificationSettings.gradeUpdates ? 'bg-red-800' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          notificationSettings.gradeUpdates ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Attendance Alerts</h3>
                        <p className="text-sm text-gray-500">Receive attendance notifications</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationSettings({...notificationSettings, attendanceAlerts: !notificationSettings.attendanceAlerts})}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                          notificationSettings.attendanceAlerts ? 'bg-red-800' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          notificationSettings.attendanceAlerts ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Parent Messages</h3>
                        <p className="text-sm text-gray-500">Get notified of parent communications</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationSettings({...notificationSettings, parentMessages: !notificationSettings.parentMessages})}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                          notificationSettings.parentMessages ? 'bg-red-800' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          notificationSettings.parentMessages ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">System Notifications</h3>
                        <p className="text-sm text-gray-500">Receive system announcements</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationSettings({...notificationSettings, systemNotifications: !notificationSettings.systemNotifications})}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                          notificationSettings.systemNotifications ? 'bg-red-800' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          notificationSettings.systemNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
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

          {/* Academic Tab */}
          {activeTab === "academic" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Current Semester</h3>
                      <p className="text-lg font-semibold text-gray-900">First Semester 2024-2025</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Assigned Classes</h3>
                      <p className="text-lg font-semibold text-gray-900">3 Classes</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
                      <p className="text-lg font-semibold text-gray-900">87 Students</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Subjects Teaching</h3>
                      <p className="text-lg font-semibold text-gray-900">Mathematics, Science</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <DocumentTextIcon className="w-6 h-6 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Export Grades</p>
                      <p className="text-sm text-gray-500">Download grade reports</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <AcademicCapIcon className="w-6 h-6 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Class Schedule</p>
                      <p className="text-sm text-gray-500">View teaching schedule</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <BellIcon className="w-6 h-6 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Send Notifications</p>
                      <p className="text-sm text-gray-500">Contact parents</p>
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
