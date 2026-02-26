import { useState } from "react";
import {
  Bars3Icon,
  Cog6ToothIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  UsersIcon,
  DocumentChartBarIcon,
  BuildingLibraryIcon,
  ClockIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: <ChartBarIcon className="w-6 h-6" />, path: "/admin/admin-dashboard" },
    { name: "Create Admin Account", icon: <UserPlusIcon className="w-6 h-6" />, path: "/admin/create-account" },
    { name: "Teachers", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/admin-teachers" },
    { name: "Approvals", icon: <ClockIcon className="w-6 h-6" />, path: "/admin/approvals" },
    { name: "Students", icon: <AcademicCapIcon className="w-6 h-6" />, path: "/admin/admin-students" },
    { name: "Grades", icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, path: "/admin/admin-grades" },
    { name: "Classes", icon: <BuildingLibraryIcon className="w-6 h-6" />, path: "/admin/admin-classes" },
    { name: "Assign Adviser", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/assign-adviser" },
    { name: "Assign Subject Teacher", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/assign-subject-teacher" },
    { name: "Attendance", icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, path: "/admin/admin-attendance" },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-[#8f0303] text-white flex flex-col justify-between transition-[width] duration-500 ease-in-out z-30 ${
        sidebarOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="px-4 py-5 border-b border-red-700/50 flex items-center">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white transition-transform duration-300 hover:scale-110"
        >
          <Bars3Icon className="w-6 h-6 translate-x-[10px]" />
        </button>
      </div>

      <nav className="flex flex-col mt-2 space-y-1 flex-1">
        {menuItems.map((item) => (
          <div
            key={item.name}
            className="relative"
            onMouseEnter={() => setHoveredItem(item.name)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-4 px-5 py-3 w-full text-left transition-all duration-300 ease-in-out rounded-md ${
                location.pathname === item.path
                  ? "bg-red-700"
                  : "hover:bg-red-700"
              }`}
            >
              {item.icon}
              {sidebarOpen && (
                <span className="text-sm transition-all duration-300 ease-in-out">
                  {item.name}
                </span>
              )}
            </button>

            {!sidebarOpen && hoveredItem === item.name && (
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg"
                style={{ animation: "fadeIn 0.2s ease-in-out" }}
              >
                {item.name}
              </div>
            )}
          </div>
        ))}
      </nav>

        <div
          onClick={() => navigate("/admin/settings")}
          className={`relative px-5 py-3 flex items-center gap-4 w-full text-left transition-all duration-300 ease-in-out rounded-md cursor-pointer ${
            location.pathname === "/admin/settings"
              ? "bg-red-700"
              : "hover:bg-red-700"
          }`}
          onMouseEnter={() => setHoveredItem("Settings")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Cog6ToothIcon className="w-6 h-6" />

          {sidebarOpen && (
            <span className="text-sm transition-all duration-300 ease-in-out">
              Settings
            </span>
          )}

          {!sidebarOpen && hoveredItem === "Settings" && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
              Settings
            </div>
          )}
        </div>
    </aside>
  );
}
