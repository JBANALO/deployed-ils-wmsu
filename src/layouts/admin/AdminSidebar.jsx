import { useState } from "react";
import {
  Bars3Icon,
  Cog6ToothIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  UsersIcon,
  DocumentChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
  BuildingLibraryIcon,
  ClipboardDocumentIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: <ChartBarIcon className="w-6 h-6" />, path: "/admin/admin-dashboard" },
    { name: "Teachers", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/admin-teachers" },
    { name: "Approvals", icon: <ClockIcon className="w-6 h-6" />, path: "/admin/approvals" },
    { name: "Students", icon: <AcademicCapIcon className="w-6 h-6" />, path: "/admin/admin-students" },
    { name: "Grades", icon: <ClipboardDocumentIcon className="w-6 h-6" />, path: "/admin/admin-grades" },
    { name: "Classes", icon: <BuildingLibraryIcon className="w-6 h-6" />, path: "/admin/admin-classes" },
    { name: "Assign Adviser", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/assign-adviser" },
    { name: "Assign Subject Teacher", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/assign-subject-teacher" },
    { name: "Attendance", icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, path: "/admin/admin-attendance" },
    { name: "Reports", icon: <DocumentChartBarIcon className="w-6 h-6" />, path: "/admin/admin-reports" },
  ];

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[#8f0303] text-white
        transform transition-transform duration-300 ease-in-out
        flex flex-col justify-between
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:relative lg:w-64
      `}
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
                location.pathname === item.path ? "bg-red-700" : "hover:bg-red-700"
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="text-sm">{item.name}</span>}
            </button>

            {!sidebarOpen && hoveredItem === item.name && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {item.name}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div
        className="relative px-4 py-4 flex items-center gap-3 hover:bg-red-700 transition-all duration-300 ease-in-out cursor-pointer"
        onMouseEnter={() => setHoveredItem("Settings")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Cog6ToothIcon className="w-6 h-6 flex-shrink-0 translate-x-[10px]" />
        {sidebarOpen && <span className="text-sm translate-x-[10px]">Settings</span>}
        {!sidebarOpen && hoveredItem === "Settings" && (
          <div className="absolute left-[90px] top-1/2 -translate-y-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
            Settings
          </div>
        )}
      </div>
    </aside>
  );
}
