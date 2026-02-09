import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, UserCircleIcon, ChevronDownIcon, Bars3Icon } from "@heroicons/react/24/solid";

export default function AdminTopbar({ sidebarOpen, setSidebarOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => navigate("/login");
  const handleDashboard = () => navigate("/admin/admin-dashboard");
  const handleTeachers = () => navigate("/admin/admin-teachers");
  const handleStudents = () => navigate("/admin/admin-students");

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white shadow flex items-center justify-between px-4 md:px-8 border-b border-gray-200 z-20 transition-all duration-500 ease-in-out ${
        sidebarOpen ? "md:left-64" : "md:left-20"
      } left-0`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-gray-700 hover:text-red-800 transition-colors"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <img
          src="/wmsu-logo.jpg"
          alt="Logo"
          className="w-10 h-10 rounded-full object-cover"
        />
        <h1 className="text-xs md:text-sm font-semibold leading-tight pl-0 md:pl-3 line-clamp-2">
          WMSU ILS - Elementary (Admin)
        </h1>
      </div>

      <div className="flex items-center gap-6 relative">
        <BellIcon className="w-6 h-6 text-red-800 cursor-pointer hover:scale-110 transition-all" />
        <div className="relative">
          <button
            className="flex items-center gap-2"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <UserCircleIcon className="w-8 h-8 text-red-800" />
            <ChevronDownIcon className="w-4 h-4 text-red-800" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-56 text-sm z-10 animate-fadeIn">
              <div className="px-4 py-2 border-b font-semibold">
                Admin Account
              </div>
              <ul>
                <li 
                  onClick={handleDashboard}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Dashboard
                </li>
                <li 
                  onClick={handleTeachers}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Manage Teachers
                </li>
                <li 
                  onClick={handleStudents}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Manage Students
                </li>
                <hr />
                <li
                  onClick={handleLogout}
                  className="px-4 py-2 text-red-800 hover:bg-gray-100 cursor-pointer"
                >
                  Log Out
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
