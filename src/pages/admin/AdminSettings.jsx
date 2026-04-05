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

      {/* ACTION BUTTONS */}
      <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {hasChanges() && (
            <span className="text-orange-600 font-medium">⚠ You have unsaved changes</span>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSettings(initialSettings);
              toast.info('Changes discarded');
            }}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            className="px-6 py-2 bg-red-800 text-white rounded-md flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
            {!isSaving && <PencilIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
