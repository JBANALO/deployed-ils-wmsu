import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to expanded

  return (
    <div className="flex h-screen bg-gray-50 font-montserrat overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content area */}
      <div
        className={`flex flex-col flex-1 transition-all duration-500 overflow-hidden ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <AdminTopbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-4 md:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
