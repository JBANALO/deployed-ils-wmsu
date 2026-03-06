import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  UserCircleIcon, 
  HomeModernIcon, 
  LifebuoyIcon, 
  ArrowLeftStartOnRectangleIcon,
  ChevronDownIcon 
} from "@heroicons/react/24/solid";

export default function StudentTopbar({ studentName, gradeLevel }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleStudentDashboard = () => {
    navigate("/student/student-dashboard");
    setDropdownOpen(false);
  };

  const handleCustomerService = () => {
    navigate("/student/customer-service-page");
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-red-900 text-white flex items-center justify-between px-8 z-50 shadow-xl">
      <div className="flex items-center gap-4">
        <img 
          src="/wmsu-logo.jpg" 
          alt="WMSU Logo" 
          className="w-10 h-10 rounded-full border-2 border-white shadow-md"
        />
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            WMSU ILS - Elementary Student Portal
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 hover:bg-red-800 px-4 py-2 rounded-xl transition-all duration-200"
          >
            <UserCircleIcon className="w-10 h-10" />
            <div className="text-left">
              <p className="font-semibold text-sm">{studentName || "Student"}</p>
              <p className="text-xs opacity-90">{gradeLevel || "Grade"}</p>
            </div>
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)}
              />

              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fadeIn">
                <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b">
                  <p className="font-bold text-gray-800">{studentName || "Student"}</p>
                  <p className="text-sm text-gray-600">{gradeLevel || "Student"} Student</p>
                </div>

                <ul className="text-gray-700">
                  <li
                    onClick={handleStudentDashboard}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-100 cursor-pointer transition"
                  >
                    <HomeModernIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Portal</span>
                  </li>

                  <li
                    onClick={handleCustomerService}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-100 cursor-pointer transition"
                  >
                    <LifebuoyIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Customer Service</span>
                  </li>

                  <div className="border-gray-300 border-t" />
                  
                  <li
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-red-50 text-red-600 cursor-pointer font-medium transition"
                  >
                    <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
                    <span>Log Out</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}