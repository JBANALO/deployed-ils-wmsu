import { useState, useEffect } from "react";
import {
  UserCircleIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarSquareIcon,
} from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeClasses: 0,
    averageAttendance: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 15 seconds to reflect admin changes immediately
    const interval = setInterval(() => {
      loadDashboardData();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user from localStorage
      let user = null;
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          console.error('Failed to parse user:', e);
        }
      }

      // Fetch classes assigned to this teacher (adviser + subject teacher)
      let assignedClasses = [];
      if (user?.id) {
        try {
          const [adviserRes, stRes] = await Promise.all([
            axios.get(`/classes/adviser/${user.id}`),
            axios.get(`/classes/subject-teacher/${user.id}`)
          ]);
          const adviserClasses = Array.isArray(adviserRes.data.data) ? adviserRes.data.data : [];
          const stClasses = Array.isArray(stRes.data.data) ? stRes.data.data : [];
          const combined = [...adviserClasses, ...stClasses];
          assignedClasses = Array.from(new Map(combined.map(c => [c.id, c])).values());
        } catch (e) {
          console.error('Error fetching assigned classes:', e);
        }
      }

      // Fetch students — send teacherId so backend filters, then JS-filter as safety net
      const studentsUrl = user?.id ? `/students?teacherId=${user.id}` : '/students';
      const studentsResponse = await axios.get(studentsUrl);
      let students = Array.isArray(studentsResponse.data.data) 
        ? studentsResponse.data.data 
        : Array.isArray(studentsResponse.data) 
        ? studentsResponse.data 
        : [];

      // JS-side filter by assigned classes (safety net for stale cache / type mismatches)
      if (assignedClasses.length > 0 && students.length > 0) {
        const normalize = str => (str || '').toString().trim().toLowerCase();
        students = students.filter(student =>
          assignedClasses.some(c =>
            normalize(c.grade) === normalize(student.gradeLevel) &&
            normalize(c.section) === normalize(student.section)
          )
        );
      }

      // Fetch attendance
      const attendanceResponse = await axios.get('/attendance');
      const allAttendance = Array.isArray(attendanceResponse.data.data) 
        ? attendanceResponse.data.data 
        : Array.isArray(attendanceResponse.data) 
        ? attendanceResponse.data 
        : [];

      // Count unique classes (grade + section combinations)
      const classesSet = new Set();
      students.forEach(student => {
        classesSet.add(`${student.gradeLevel}-${student.section}`);
      });

      // Calculate average attendance (last 7 days)
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentAttendance = allAttendance.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= sevenDaysAgo && recordDate <= today;
      });

      const presentCount = recentAttendance.filter(r => r.status === 'Present').length;
      const totalCount = recentAttendance.length;
      const avgAttendance = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

      setStats({
        totalStudents: students.length,
        activeClasses: classesSet.size,
        averageAttendance: avgAttendance
      });

      // Build recent activity from latest attendance and updates
      const activities = [];

      // Add recent attendance records
      const latestAttendance = allAttendance
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 2);

      latestAttendance.forEach(record => {
        const date = new Date(record.timestamp);
        const hoursAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60));
        activities.push({
          type: 'attendance',
          message: `Attendance recorded: ${record.studentName}`,
          detail: `${record.gradeLevel} - ${record.section} (${record.status})`,
          time: hoursAgo === 0 ? 'Just now' : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
        });
      });

      // Add student count milestone
      if (activities.length < 2) {
        activities.push({
          type: 'students',
          message: `Total students in system: ${students.length}`,
          detail: `Across ${classesSet.size} active classes`,
          time: 'Today'
        });
      }

      setRecentActivity(activities);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <UserCircleIcon className="w-30 h-30 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
          <h2 className="text-6xl pl-5 font-bold text-gray-900">Dashboard</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center shadow border border-gray-300 border-l-red-800 border-l-8 hover:shadow-md transition">
          <UsersIcon className="w-6 h-6 flex mx-auto text-[#8f0303]" />
          <p className="text-sm text-gray-500">Total Students</p>
          <h3 className="text-2xl font-semibold text-[#b30000]">{stats.totalStudents}</h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-center shadow border border-gray-300 border-l-red-800 border-l-8 hover:shadow-md transition">
          <CalendarIcon className="w-6 h-6 flex mx-auto text-[#8f0303]" />
          <p className="text-sm text-gray-500">Active Classes</p>
          <h3 className="text-2xl font-semibold text-[#b30000]">{stats.activeClasses}</h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-center shadow border border-gray-300 border-l-red-800 border-l-8 hover:shadow-md transition">
          <ChartBarSquareIcon className="w-6 h-6 flex mx-auto text-[#8f0303]" />
          <p className="text-sm text-gray-500">Average Attendance</p>
          <h3 className="text-2xl font-semibold text-[#b30000]">{stats.averageAttendance}%</h3>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-300">
        <h3 className="text-2xl font-bold mb-4 text-gray-900">Recent Activity</h3>
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading recent activity...</p>
        ) : recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="bg-blue-50 p-3 rounded-md border border-gray-200 hover:shadow-sm transition">
                <p className="font-medium">{activity.message}</p>
                <p className="text-xs text-gray-600">{activity.detail}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
