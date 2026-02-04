import React, { useState, useEffect } from "react";
import { UsersIcon, BookOpenIcon, ClipboardDocumentListIcon, ChartBarIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import AdminTeachers from "./AdminTeachers";
import { useNavigate } from "react-router-dom";
import AdminStudents from "./AdminStudents";
import AdminClasses from "./AdminClasses";
import AdminReports from "./AdminReports";
import axios from "../../api/axiosConfig";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalAttendanceRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Fetch students
      const studentsRes = await axios.get('/students');
      const students = Array.isArray(studentsRes.data.data) ? studentsRes.data.data : 
                       Array.isArray(studentsRes.data) ? studentsRes.data : [];

      // Fetch teachers
      const usersRes = await axios.get('/users');
      const allUsers = usersRes.data?.data?.users || usersRes.data?.users || [];
      const teachers = allUsers.filter(u => ['teacher', 'subject_teacher', 'adviser'].includes(u.role));

      // Calculate unique classes (grade + section combinations)
      const uniqueClasses = [...new Set(students.map(s => `${s.gradeLevel}-${s.section}`))].filter(c => c !== 'undefined-undefined');

      // Fetch attendance records
      const attendanceRes = await axios.get('/attendance');
      const attendance = Array.isArray(attendanceRes.data.data) ? attendanceRes.data.data : 
                         Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: uniqueClasses.length,
        totalAttendanceRecords: attendance.length
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <Cog6ToothIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
          <h2 className="text-6xl pl-5 font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-400 ml-80 mt-6">Welcome, Admin!</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 bg-white rounded-lg shadow p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection("overview")}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeSection === "overview" ? "bg-blue-500 text-white" : "hover:bg-blue-50 text-gray-700"}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSection("teachers")}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeSection === "teachers" ? "bg-blue-500 text-white" : "hover:bg-blue-50 text-gray-700"}`}
            >
              Manage Teachers
            </button>
            <button
              onClick={() => navigate("/admin/create-teacher")}
              className="w-full text-left mt-1 px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              + Create Teacher Account
            </button>
            <button
              onClick={() => setActiveSection("students")}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeSection === "students" ? "bg-blue-500 text-white" : "hover:bg-blue-50 text-gray-700"}`}
            >
              Manage Students
            </button>
            <button
              onClick={() => setActiveSection("classes")}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeSection === "classes" ? "bg-blue-500 text-white" : "hover:bg-blue-50 text-gray-700"}`}
            >
              Manage Classes
            </button>
            <button
              onClick={() => setActiveSection("reports")}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeSection === "reports" ? "bg-blue-500 text-white" : "hover:bg-blue-50 text-gray-700"}`}
            >
              Reports & Analytics
            </button>
          </nav>
        </aside>

        <main className="col-span-9 bg-white rounded-lg shadow p-6">
          {activeSection === "overview" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">System Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-500">Total Students</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {loading ? '...' : stats.totalStudents.toLocaleString()}
                    </p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-500">Teachers</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {loading ? '...' : stats.totalTeachers}
                    </p>
                  </div>
                  <BookOpenIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-500">Classes</h3>
                    <p className="text-2xl font-bold text-yellow-600">
                      {loading ? '...' : stats.totalClasses}
                    </p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="bg-purple-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-500">Attendance Records</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {loading ? '...' : stats.totalAttendanceRecords.toLocaleString()}
                    </p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {activeSection === "teachers" && <AdminTeachers />}
          {activeSection === "students" && <AdminStudents />}
          {activeSection === "classes" && <AdminClasses />}
          {activeSection === "reports" && <AdminReports />}
        </main>
      </div>
    </div>
  );
}
