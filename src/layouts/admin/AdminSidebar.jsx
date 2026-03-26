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
  CalendarDaysIcon,
  BookOpenIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/solid";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current user role
  const getCurrentUserRole = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || 'admin';
  };

  const currentUserRole = getCurrentUserRole();

  const menuItems = [
    { name: "Dashboard", icon: <ChartBarIcon className="w-6 h-6" />, path: "/admin/admin-dashboard" },
    { name: "Admin Accounts", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/admin-teachers", role: "super_admin" },
    { name: "Teacher Accounts", icon: <AcademicCapIcon className="w-6 h-6" />, path: "/admin/admin-students", role: "super_admin" },
    { name: "Students Accounts", icon: <UserPlusIcon className="w-6 h-6" />, path: "/admin/admin-grades", role: "super_admin" },
    { name: "Teachers", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/admin-teachers" },
    { name: "Students", icon: <AcademicCapIcon className="w-6 h-6" />, path: "/admin/admin-students" },
    { name: "Grades", icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, path: "/admin/admin-grades" },
    { name: "Classes", icon: <BuildingLibraryIcon className="w-6 h-6" />, path: "/admin/admin-classes" },
    { name: "Subjects", icon: <BookOpenIcon className="w-6 h-6" />, path: "/admin/subjects" },
    { name: "Sections", icon: <RectangleGroupIcon className="w-6 h-6" />, path: "/admin/sections" },
    { name: "Assign Adviser", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/assign-adviser" },
    { name: "Attendance", icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, path: "/admin/admin-attendance" },
    { name: "School Year", icon: <CalendarDaysIcon className="w-6 h-6" />, path: "/admin/school-year" },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-[#8f0303] text-white flex flex-col transition-[width] duration-500 ease-in-out z-30 ${
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

      <nav className="flex flex-col mt-2 space-y-1 flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b91c1c transparent' }}>
        {menuItems
          .filter(item => !item.role || item.role === currentUserRole)
          .map((item) => (
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
