import { useState } from "react";
import {
  Bars3Icon,
  Cog6ToothIcon,
  ChartBarIcon,
  UsersIcon,
  AcademicCapIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  BookOpenIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/solid";
import { useNavigate, useLocation } from "react-router-dom";

export default function SuperAdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Super Admin Dashboard", icon: <ShieldCheckIcon className="w-6 h-6" />, path: "/admin/super-admin" },
    { name: "Admin Accounts", icon: <UsersIcon className="w-6 h-6" />, path: "/admin/admin-accounts" },
    { name: "Teacher Accounts", icon: <AcademicCapIcon className="w-6 h-6" />, path: "/admin/teacher-accounts" },
    { name: "Student Accounts", icon: <UserPlusIcon className="w-6 h-6" />, path: "/admin/student-accounts" },
    { name: "Admin Dashboard", icon: <ChartBarIcon className="w-6 h-6" />, path: "/admin/admin-dashboard" },
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
              className={`flex items-center gap-4 px-5 py-2 w-full text-left transition-all duration-300 ease-in-out rounded-md ${
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

      </aside>
  );
}
