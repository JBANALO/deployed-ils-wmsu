import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, UserCircleIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

export default function TeacherTopbar({ sidebarOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const fullName = `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || user.name || user.email || "User";
        setUserName(fullName);
      }
    } catch (error) {
      console.error("Failed to read user from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastAdminEmail');
    localStorage.removeItem('lastTeacherEmail');
    localStorage.removeItem('lastStudentEmail');
    
    // Navigate to login
    navigate("/login");
  };
  const handleMainDashboard = () => navigate("/teacher/teacher-dashboard");
  const handleProfile = () => navigate("/teacher/teacher-profile");
  const handleGradesPortal = () => navigate("/edit-grades");
  const handleAttendancePage = () => navigate("/qr-portal");

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white shadow flex items-center justify-between px-8 border-b border-gray-200 z-20 transition-all duration-500 ease-in-out ${
        sidebarOpen ? "left-64" : "left-20"
      }`}
    >
      <div className="flex items-center">
        <img
          src="/wmsu-logo.jpg"
          alt="Logo"
          className="w-10 h-10 rounded-full object-cover"
        />
        <h1 className="text-sm font-semibold leading-tight pl-3">
          WMSU ILS - Elementary Department
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
            <ChevronDownIcon className={`w-4 h-4 text-red-800 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDropdown && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-56 text-sm z-10 animate-fadeIn">
              <div className="px-4 py-2 border-b font-semibold">
                {userName || "Loading..."}
              </div>
              <ul>
                <li 
                  onClick={handleMainDashboard}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Dashboard
                </li>
                <li 
                  onClick={handleProfile}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Profile
                </li>
                <li 
                  onClick={handleGradesPortal}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Edit Grades
                </li>
                <li 
                  onClick={handleAttendancePage}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  QR Code Portal
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