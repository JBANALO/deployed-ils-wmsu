import { useState, useEffect } from "react";
import {
  UserCircleIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarSquareIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import {
  appendSchoolYearId,
  dedupeTeacherClasses,
  getTeacherViewingSchoolYearId,
  setTeacherActiveSchoolYearId,
  setTeacherViewingSchoolYearId,
} from "../../utils/teacherSchoolYear";

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeClasses: 0,
    averageAttendance: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(() => getTeacherViewingSchoolYearId());
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [assignedClassKeys, setAssignedClassKeys] = useState([]);

  useEffect(() => {
    loadDashboardData();
    fetchActiveSchoolYear();
    fetchSchoolYears();
    
    // Auto-refresh every 15 seconds to reflect admin changes immediately
    const interval = setInterval(() => {
      loadDashboardData();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSchoolYearId) {
      setTeacherViewingSchoolYearId(selectedSchoolYearId);
      loadDashboardData(selectedSchoolYearId);
    }
  }, [selectedSchoolYearId]);

  const fetchSchoolYears = async () => {
    try {
      const res = await axios.get('/school-years');
      const list = res.data?.data || [];
      setSchoolYears(list.map((sy) => ({ ...sy, label: sy.label?.includes('-') ? sy.label : `${String(sy.label).slice(0,4)}-${String(sy.label).slice(4)}` })));
    } catch (err) {
      // non-critical
    }
  };

  const fetchActiveSchoolYear = async () => {
    try {
      const res = await axios.get('/school-years/active');
      let schoolYear = res.data?.data || res.data || null;
      
      // Format the school year label to add dash if missing
      if (schoolYear && schoolYear.label && !schoolYear.label.includes('-')) {
        // Convert 20262027 to 2026-2027
        const year = schoolYear.label;
        if (year.length === 8 && /^\d{8}$/.test(year)) {
          schoolYear = { ...schoolYear, label: `${year.slice(0, 4)}-${year.slice(4)}` };
        }
      }
      
      setActiveSchoolYear(schoolYear);
      if (schoolYear?.id) {
        setTeacherActiveSchoolYearId(String(schoolYear.id));
      }
      if (schoolYear?.id && !selectedSchoolYearId) {
        const defaultId = String(schoolYear.id);
        setSelectedSchoolYearId(defaultId);
        setTeacherViewingSchoolYearId(defaultId);
      }
    } catch (e) {
      // non-critical
    }
  };

  const fetchPromotionHistory = async (classKeys) => {
    try {
      const syQuery = selectedSchoolYearId ? `?schoolYearId=${selectedSchoolYearId}` : '';
      const res = await axios.get(`/school-years/promotion-history${syQuery}`);
      const all = Array.isArray(res.data?.data) ? res.data.data : [];
      if (classKeys.length === 0) {
        setPromotionHistory([]);
        return;
      }
      const normalize = str => (str || '').toString().trim().toLowerCase();
      const normalizeGrade = str => normalize(str).replace(/^grade\s+/, '');
      // Show history rows where the student's from_grade+from_section belonged to this teacher
      const filtered = all.filter(row =>
        classKeys.some(k => {
          const [kg, ks] = k.split('||');
          return normalizeGrade(row.from_grade) === normalizeGrade(kg) && normalize(row.from_section) === normalize(ks);
        })
      );
      setPromotionHistory(filtered);
    } catch (e) {
      // non-critical
    }
  };

  const loadDashboardData = async (overrideSyId) => {
    try {
      setLoading(true);
      const syParam = overrideSyId || selectedSchoolYearId || '';
      const querySuffix = syParam ? `?schoolYearId=${syParam}` : '';
      
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
            axios.get(appendSchoolYearId(`/classes/adviser/${user.id}`, syParam)),
            axios.get(appendSchoolYearId(`/classes/subject-teacher/${user.id}`, syParam))
          ]);
          let adviserClasses = Array.isArray(adviserRes.data.data) ? adviserRes.data.data : [];
          const stClasses = Array.isArray(stRes.data.data) ? stRes.data.data : [];
          // Fallback: if no adviser classes by ID, search by adviser_name (partial match for middle names)
          if (adviserClasses.length === 0 && user.firstName && user.lastName) {
            try {
              const allRes = await axios.get(appendSchoolYearId('/classes', syParam));
              const allClasses = Array.isArray(allRes.data) ? allRes.data : [];
              adviserClasses = allClasses.filter(c =>
                c.adviser_name &&
                c.adviser_name.includes(user.firstName) &&
                c.adviser_name.includes(user.lastName)
              );
            } catch (fbErr) { /* non-critical */ }
          }
          const combined = [...adviserClasses, ...stClasses];
          assignedClasses = dedupeTeacherClasses(combined);
          // Store keys for promotion history filtering
          const keys = assignedClasses.map(c => `${c.grade}||${c.section}`);
          setAssignedClassKeys(keys);
          fetchPromotionHistory(keys);
        } catch (e) {
          console.error('Error fetching assigned classes:', e);
        }
      }

      // Fetch students — send teacherId so backend filters, then JS-filter as safety net
      const studentsUrl = user?.id ? `/students?teacherId=${user.id}${syParam ? `&schoolYearId=${syParam}` : ''}` : `/students${querySuffix}`;
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
      const attendanceResponse = await axios.get(`/attendance${querySuffix}`);
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
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <UserCircleIcon className="w-30 h-30 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
            <div className="pl-5">
              <h2 className="text-6xl font-bold text-gray-900">Dashboard</h2>
              {activeSchoolYear?.label && (
                <p className="text-sm text-gray-500 mt-1">Active SY: <span className="font-semibold text-red-800">{activeSchoolYear.label}</span></p>
              )}
            </div>
          </div>
          <div className="w-full lg:w-64">
            <label className="text-xs text-gray-500">View School Year</label>
            <select
              value={selectedSchoolYearId}
              onChange={(e) => setSelectedSchoolYearId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Select school year</option>
              {schoolYears.map((sy) => (
                <option key={sy.id} value={sy.id}>{sy.label}</option>
              ))}
            </select>
            {selectedSchoolYearId && activeSchoolYear?.id && Number(selectedSchoolYearId) !== Number(activeSchoolYear.id) && (
              <p className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded mt-1">View-only: past school year</p>
            )}
          </div>
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

      {/* Promotion History */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AcademicCapIcon className="w-7 h-7 text-red-800" />
            Promotion History Logs
          </h3>
          <span className="text-xs text-gray-500">{promotionHistory.length} record{promotionHistory.length !== 1 ? 's' : ''}</span>
        </div>
        {promotionHistory.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No promotion records for your class yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Student</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">LRN</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">From</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">To</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Average</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {promotionHistory.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">{row.student_name}</td>
                    <td className="py-2 px-3 text-gray-600">{row.lrn || '-'}</td>
                    <td className="py-2 px-3 text-gray-700">{row.from_grade}{row.from_section ? ` - ${row.from_section}` : ''}</td>
                    <td className="py-2 px-3 text-gray-700">{row.to_grade || '-'}{row.to_section ? ` - ${row.to_section}` : ''}</td>
                    <td className="py-2 px-3 text-center text-gray-700">{row.average ?? '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'promoted' ? 'bg-green-100 text-green-700' :
                        row.status === 'graduated' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
