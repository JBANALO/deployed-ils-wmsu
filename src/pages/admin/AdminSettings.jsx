import React, { useState } from "react";
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

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");

  const [settings, setSettings] = useState({
    siteName: "WMSU ILS-Elementary Department",
    siteDescription:
      "Automated Grades Portal and Students Attendance using QR Code",
    adminEmail: "admin@wmsu.edu.ph",
    allowRegistration: true,
    requireApproval: true,
    sessionTimeout: "30",
    maintenance: false,
    notifications: {
      email: true,
      sms: false,
      browser: true,
    },
    backup: {
      enabled: true,
      frequency: "daily",
      lastBackup: "2024-02-16 23:00:00",
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleSave = async () => {
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  const notificationOptions = [
    {
      key: "email",
      label: "Email Notifications",
      icon: DocumentTextIcon,
      color: "text-blue-600",
    },
    {
      key: "sms",
      label: "SMS Notifications",
      icon: BellIcon,
      color: "text-green-600",
    },
    {
      key: "browser",
      label: "Browser Notifications",
      icon: GlobeAltIcon,
      color: "text-purple-600",
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

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">
              Settings saved successfully!
            </p>
            <p className="text-sm text-green-600">
              Your changes have been applied.
            </p>
          </div>
        </div>
      )}

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
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) =>
                      handleInputChange("siteName", e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />

                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) =>
                      handleInputChange("adminEmail", e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <textarea
                  value={settings.siteDescription}
                  onChange={(e) =>
                    handleInputChange("siteDescription", e.target.value)
                  }
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Allow Registration */}
                <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                  <span>Allow Registration</span>
                  <button
                    onClick={() =>
                      handleInputChange(
                        "allowRegistration",
                        !settings.allowRegistration
                      )
                    }
                  >
                    {settings.allowRegistration ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Require Approval */}
                <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                  <span>Require Approval</span>
                  <button
                    onClick={() =>
                      handleInputChange(
                        "requireApproval",
                        !settings.requireApproval
                      )
                    }
                  >
                    {settings.requireApproval ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <select
                value={settings.sessionTimeout}
                onChange={(e) =>
                  handleInputChange("sessionTimeout", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>

              <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                <span>Maintenance Mode</span>
                <button
                  onClick={() =>
                    handleInputChange(
                      "maintenance",
                      !settings.maintenance
                    )
                  }
                >
                  {settings.maintenance ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              {notificationOptions.map((n) => (
                <div
                  key={n.key}
                  className="flex justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <n.icon className={`w-5 h-5 ${n.color}`} />
                    {n.label}
                  </div>

                  <button
                    onClick={() =>
                      handleInputChange(
                        "notifications",
                        !settings.notifications[n.key],
                        n.key
                      )
                    }
                  >
                    {settings.notifications[n.key] ? "ON" : "OFF"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* BACKUP */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              <select
                value={settings.backup.frequency}
                onChange={(e) =>
                  handleInputChange("backup", e.target.value, "frequency")
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>

              <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                <span>Auto Backup</span>
                <button
                  onClick={() =>
                    handleInputChange(
                      "backup",
                      !settings.backup.enabled,
                      "enabled"
                    )
                  }
                >
                  {settings.backup.enabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex justify-between">
                <div>
                  <p className="font-medium">Last Backup</p>
                  <p className="text-sm text-blue-600">
                    {settings.backup.lastBackup}
                  </p>
                </div>

                <button className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Backup Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="bg-white rounded-lg shadow p-6 flex justify-end gap-4">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 border rounded-md"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-red-800 text-white rounded-md flex items-center gap-2"
        >
          {isSaving ? "Saving..." : "Save Changes"}
          {!isSaving && <PencilIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
