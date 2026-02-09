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

export default function AdminSidebar({ sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }) {
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
        bg-[#8f0303] text-white 
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? "w-20" : "w-64"}
        h-screen fixed left-0 top-0
        flex flex-col
        z-50 overflow-hidden
      `}
    >
      {/* Hamburger Button */}
      <div className="p-4 flex items-center justify-between border-b border-red-700">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 hover:bg-red-700 rounded-lg transition-colors w-full flex items-center justify-center"
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-4 px-4 py-3
                hover:bg-red-700 transition-colors
                ${isActive ? "bg-red-700 border-l-4 border-white" : ""}
                ${sidebarCollapsed ? "justify-center px-0" : "justify-start"}
              `}
              title={sidebarCollapsed ? item.name : ""}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span
                className={`
                  whitespace-nowrap transition-all duration-300
                  ${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}
                `}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div
        className={`
          border-t border-red-700 p-4 flex items-center gap-4
          hover:bg-red-700 transition-colors cursor-pointer
          ${sidebarCollapsed ? "justify-center" : "justify-start"}
        `}
        title={sidebarCollapsed ? "Settings" : ""}
      >
        <Cog6ToothIcon className="w-6 h-6 flex-shrink-0" />
        <span
          className={`
            whitespace-nowrap transition-all duration-300
            ${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}
          `}
        >
          Settings
        </span>
      </div>
    </aside>
  );
}
