import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, UserCircleIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

export default function AdminTopbar({ sidebarOpen, setSidebarOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => navigate("/login");
  const handleDashboard = () => navigate("/admin/admin-dashboard");
  const handleTeachers = () => navigate("/admin/admin-teachers");
  const handleStudents = () => navigate("/admin/admin-students");

  return (
    <header className="sticky top-0 bg-white shadow-sm border-b border-gray-200 z-30">
      <div className="flex items-center justify-between px-6 py-4 h-16">
        <div className="flex items-center gap-3">
          <img
            src="/wmsu-logo.jpg"
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <h1 className="text-sm font-semibold text-gray-900 hidden sm:block">
            WMSU ILS - Elementary (Admin)
          </h1>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <BellIcon className="w-5 h-5 md:w-6 md:h-6 text-red-800 cursor-pointer hover:scale-110 transition-all flex-shrink-0" />
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="User menu"
            >
              <UserCircleIcon className="w-8 h-8 text-red-800 flex-shrink-0" />
              <ChevronDownIcon className="w-4 h-4 text-red-800 hidden sm:block" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-48 text-sm z-50">
                <div className="px-4 py-2 border-b font-semibold text-gray-700">
                  Admin Account
                </div>
                <ul>
                  <li 
                    onClick={handleDashboard}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Dashboard
                  </li>
                  <li 
                    onClick={handleTeachers}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Manage Teachers
                  </li>
                  <li 
                    onClick={handleStudents}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
                  >
                    Manage Students
                  </li>
                  <hr className="my-1" />
                  <li
                    onClick={handleLogout}
                    className="px-4 py-2 text-red-800 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    Log Out
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
