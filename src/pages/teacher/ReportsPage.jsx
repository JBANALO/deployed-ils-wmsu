import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  CalendarIcon,
  AcademicCapIcon,
  TrophyIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  TableCellsIcon,
} from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import SF2AttendanceForm from "../../components/SF2AttendanceForm";

export default function ReportsPage() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSF2Modal, setShowSF2Modal] = useState(false);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("overview"); // overview, monthly
  const [attendanceData, setAttendanceData] = useState([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [lowestStudents, setLowestStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    classAverage: 0,
    lateStudents: 0,
    honorStudents: 0
  });
  const [monthlyStats, setMonthlyStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalDays: 0
  });
  const [loading, setLoading] = useState(true);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  useEffect(() => {
    loadReportsData();
  }, [selectedSection, selectedMonth, selectedYear]);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      // Fetch students
      const studentsResponse = await axios.get('/students');
      let studentsData = Array.isArray(studentsResponse.data.data) 
        ? studentsResponse.data.data 
        : Array.isArray(studentsResponse.data) 
        ? studentsResponse.data 
        : [];

      // Extract unique sections
      const uniqueSections = [...new Set(studentsData.map(s => `${s.gradeLevel} - ${s.section}`))].filter(Boolean);
      setSections(uniqueSections.sort());

      // Filter by section if selected
      if (selectedSection) {
        studentsData = studentsData.filter(s => `${s.gradeLevel} - ${s.section}` === selectedSection);
      }

      setStudents(studentsData);

      // Fetch attendance data
      const attendanceResponse = await axios.get('/attendance');
      const allAttendance = Array.isArray(attendanceResponse.data.data) 
        ? attendanceResponse.data.data 
        : Array.isArray(attendanceResponse.data) 
        ? attendanceResponse.data 
        : [];

      // Calculate weekly attendance (last 7 days)
      const today = new Date();
      const weekData = {};
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        
        const dayRecords = allAttendance.filter(r => r.date === dateStr);
        const present = dayRecords.filter(r => r.status?.toLowerCase() === 'present').length;
        const absent = dayRecords.filter(r => r.status?.toLowerCase() === 'absent').length;
        
        weekData[dayName] = { day: dayName, present: present || 0, absent: absent || 0 };
      }

      setAttendanceData(Object.values(weekData));

      // Calculate MONTHLY attendance for selected month
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const monthPrefix = `${selectedYear}-${monthStr}`;
      
      const monthAttendance = allAttendance.filter(r => r.date && r.date.startsWith(monthPrefix));
      
      // Filter by section if selected
      let filteredMonthAttendance = monthAttendance;
      if (selectedSection) {
        const [gradeLevel, section] = selectedSection.split(' - ');
        filteredMonthAttendance = monthAttendance.filter(r => 
          r.gradeLevel === gradeLevel && r.section === section
        );
      }

      // Group by student for monthly summary
      const studentMonthlyData = {};
      studentsData.forEach(student => {
        const studentRecords = filteredMonthAttendance.filter(r => 
          r.studentId === student.id || 
          r.studentId === student.lrn ||
          r.studentId === student.studentId
        );
        
        const presentDays = studentRecords.filter(r => r.status?.toLowerCase() === 'present').length;
        const absentDays = studentRecords.filter(r => r.status?.toLowerCase() === 'absent').length;
        const lateDays = studentRecords.filter(r => r.status?.toLowerCase() === 'late').length;
        
        studentMonthlyData[student.id] = {
          id: student.id,
          lrn: student.lrn,
          name: student.fullName || `${student.firstName} ${student.lastName}`,
          section: student.section,
          gradeLevel: student.gradeLevel,
          presentDays,
          absentDays,
          lateDays,
          totalDays: presentDays + absentDays + lateDays,
          attendanceRate: (presentDays + absentDays + lateDays) > 0 
            ? Math.round((presentDays / (presentDays + absentDays + lateDays)) * 100) 
            : 0
        };
      });

      setMonthlyAttendance(Object.values(studentMonthlyData));

      // Calculate monthly stats
      const totalPresent = filteredMonthAttendance.filter(r => r.status?.toLowerCase() === 'present').length;
      const totalAbsent = filteredMonthAttendance.filter(r => r.status?.toLowerCase() === 'absent').length;
      const totalLate = filteredMonthAttendance.filter(r => r.status?.toLowerCase() === 'late').length;
      const uniqueDays = [...new Set(filteredMonthAttendance.map(r => r.date))].length;

      setMonthlyStats({
        totalPresent,
        totalAbsent,
        totalLate,
        totalDays: uniqueDays
      });

      // Calculate subject averages
      const subjectAvgs = {};
      studentsData.forEach(student => {
        if (student.grades) {
          Object.entries(student.grades).forEach(([subject, grades]) => {
            if (!subjectAvgs[subject]) {
              subjectAvgs[subject] = { subject, total: 0, count: 0 };
            }
            const q1 = grades.q1 || 0;
            if (q1 > 0) {
              subjectAvgs[subject].total += q1;
              subjectAvgs[subject].count += 1;
            }
          });
        }
      });

      const finalSubjectData = Object.values(subjectAvgs).map(s => ({
        subject: s.subject,
        average: s.count > 0 ? Math.round(s.total / s.count) : 0
      }));

      setSubjectsData(finalSubjectData.slice(0, 5));

      // Get top performing students
      const topPerformers = students
        .filter(s => s.average && s.average > 0)
        .sort((a, b) => (b.average || 0) - (a.average || 0))
        .slice(0, 3)
        .map((s, idx) => ({
          rank: idx + 1,
          name: `${s.lastName}, ${s.firstName}`,
          avg: s.average || 0
        }));

      setTopStudents(topPerformers);

      // Get lowest performing students
      const lowestPerformers = students
        .filter(s => s.average && s.average > 0)
        .sort((a, b) => (a.average || 0) - (b.average || 0))
        .slice(0, 3)
        .map((s, idx) => ({
          rank: idx + 1,
          name: `${s.lastName}, ${s.firstName}`,
          avg: s.average || 0
        }));

      setLowestStudents(lowestPerformers);

      // Calculate statistics
      const totalStudents = students.length;
      const presentToday = allAttendance.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'Present').length;
      const lateToday = allAttendance.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'Late').length;
      const classAverage = students.length > 0 
        ? Math.round(students.reduce((sum, s) => sum + (s.average || 0), 0) / students.length * 10) / 10
        : 0;
      const honorStudents = students.filter(s => (s.average || 0) >= 90).length;

      setStats({
        attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100 * 10) / 10 : 0,
        classAverage: classAverage,
        lateStudents: lateToday,
        honorStudents: honorStudents
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading reports data:', error);
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'LRN', 'Grade Level', 'Section', 'Present Days', 'Absent Days', 'Late Days', 'Total Days', 'Attendance Rate'];
    const rows = monthlyAttendance.map(s => [
      s.name,
      s.lrn,
      s.gradeLevel,
      s.section,
      s.presentDays,
      s.absentDays,
      s.lateDays,
      s.totalDays,
      `${s.attendanceRate}%`
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 flex items-center justify-between print:hidden">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <AcademicCapIcon className="w-12 h-12 text-red-800" />
          Reports & Analytics
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
              activeTab === "overview"
                ? "bg-red-800 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
              activeTab === "monthly"
                ? "bg-red-800 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📅 Monthly Attendance
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-red-700" />
            <span className="font-semibold text-gray-800">Section:</span>
          </div>

          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-5 py-3 pr-12 bg-red-50 border-2 border-red-300 rounded-xl font-bold text-red-800 text-base focus:outline-none focus:ring-3 focus:ring-red-100 appearance-none cursor-pointer transition-all"
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <ChevronDownIcon className="w-5 h-5 text-red-800" />
            </div>
          </div>

          {activeTab === "monthly" && (
            <>
              <div className="flex items-center gap-3 ml-4">
                <span className="font-semibold text-gray-800">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-5 py-3 pr-12 bg-blue-50 border-2 border-blue-300 rounded-xl font-bold text-blue-800 text-base focus:outline-none focus:ring-3 focus:ring-blue-100 appearance-none cursor-pointer"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-5 py-3 pr-12 bg-green-50 border-2 border-green-300 rounded-xl font-bold text-green-800 text-base focus:outline-none focus:ring-3 focus:ring-green-100 appearance-none cursor-pointer"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowSF2Modal(true)}
                  className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  SF2 Form
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  Export CSV
                </button>
                <button
                  onClick={printReport}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <PrinterIcon className="w-5 h-5" />
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.attendanceRate}%</p>
              <p className="text-lg mt-2 opacity-90">Attendance Rate</p>
              <p className="text-sm opacity-80">Today</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.classAverage}</p>
              <p className="text-lg mt-2 opacity-90">Class Average</p>
              <p className="text-sm opacity-80">All subjects</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.lateStudents}</p>
              <p className="text-lg mt-2 opacity-90">Late Students</p>
              <p className="text-sm opacity-80">Today</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.honorStudents}</p>
              <p className="text-lg mt-2 opacity-90">Honor Students</p>
              <p className="text-sm opacity-80">With honors</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl shadow-2xl p-5 border border-gray-200 h-[400px]">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Weekly Attendance Trend</h3>
              <ResponsiveContainer width={"100%"} height={300}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
                  <XAxis dataKey="day" stroke="#374151" fontSize={12} />
                  <YAxis domain={[0, 40]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "2px solid #dc2626", borderRadius: "12px" }}
                    labelStyle={{ color: "#dc2626", fontWeight: "bold" }}
                  />
                  <Line type="monotone" dataKey="present" stroke="#dc2626" strokeWidth={3} dot={{ fill: "#dc2626", r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 h-[400px]">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Subject Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectsData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
                  <XAxis dataKey="subject" angle={-15} textAnchor="end" height={60} fontSize={13} />
                  <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" radius={[12, 12, 0, 0]} fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 h-[400px] w-full">
            <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-5 text-center">
              <h3 className="text-2xl font-bold flex items-center justify-center gap-4">
                <TrophyIcon className="w-6 h-6" />
                Top Performing Students
              </h3>
            </div>

            <div className="p-6 h-[calc(100%-90px)] overflow-y-auto">
              <div className="space-y-6">
                {loading ? (
                  <p className="text-center text-gray-500">Loading top students...</p>
                ) : topStudents.length === 0 ? (
                  <p className="text-center text-gray-500">No students found</p>
                ) : (
                  topStudents.map((student) => (
                    <div
                      key={student.rank}
                      className="flex items-center justify-between p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200 hover:shadow-lg transition h-[80px]"
                    >
                      <div className="flex items-center gap-6">
                        <div
                          className={`text-xl font-bold ${
                            student.rank === 1
                              ? "text-yellow-500"
                              : student.rank === 2
                              ? "text-gray-400"
                              : "text-orange-600"
                          }`}
                        >
                          #{student.rank}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900">{student.name}</p>
                          <p className="text-base text-gray-600">General Average</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-red-700">{student.avg}</p>
                        <p className="text-base font-semibold text-red-800">With Honors</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 h-[400px] w-full">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-5 text-center">
              <h3 className="text-2xl font-bold flex items-center justify-center gap-4">
                <TrophyIcon className="w-6 h-6" />
                Lowest Performing Students
              </h3>
            </div>

            <div className="p-6 h-[calc(100%-90px)] overflow-y-auto">
              <div className="space-y-6">
                {loading ? (
                  <p className="text-center text-gray-500">Loading students...</p>
                ) : lowestStudents.length === 0 ? (
                  <p className="text-center text-gray-500">No students found</p>
                ) : (
                  lowestStudents.map((student) => (
                    <div
                      key={student.rank}
                      className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 hover:shadow-lg transition h-[80px]"
                    >
                      <div className="flex items-center gap-6">
                        <div className="text-xl font-bold text-orange-600">
                          #{student.rank}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900">{student.name}</p>
                          <p className="text-base text-gray-600">General Average</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-700">{student.avg}</p>
                        <p className="text-base font-semibold text-orange-800">Needs Improvement</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* MONTHLY ATTENDANCE TAB */}
      {activeTab === "monthly" && (
        <>
          {/* Monthly Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalPresent}</p>
              <p className="text-lg mt-2 opacity-90">Total Present</p>
              <p className="text-sm opacity-80">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalAbsent}</p>
              <p className="text-lg mt-2 opacity-90">Total Absent</p>
              <p className="text-sm opacity-80">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-yellow-500 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalLate}</p>
              <p className="text-lg mt-2 opacity-90">Total Late</p>
              <p className="text-sm opacity-80">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalDays}</p>
              <p className="text-lg mt-2 opacity-90">School Days</p>
              <p className="text-sm opacity-80">With recorded attendance</p>
            </div>
          </div>

          {/* Monthly Attendance Table */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-5">
              <h3 className="text-2xl font-bold flex items-center gap-4">
                <TableCellsIcon className="w-7 h-7" />
                Monthly Attendance Summary - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </h3>
              {selectedSection && <p className="text-red-200 mt-1">Section: {selectedSection}</p>}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">LRN</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Grade & Section</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-green-700 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-red-700 uppercase tracking-wider">Absent</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-orange-700 uppercase tracking-wider">Late</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-blue-700 uppercase tracking-wider">Total Days</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-purple-700 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                        Loading attendance data...
                      </td>
                    </tr>
                  ) : monthlyAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                        No students found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    monthlyAttendance.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.lrn}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.gradeLevel} - {student.section}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold">{student.presentDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold">{student.absentDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-bold">{student.lateDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">{student.totalDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 rounded-full font-bold ${
                            student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                            student.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {student.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
              <p className="text-gray-700">
                <strong>Total Students:</strong> {monthlyAttendance.length} | 
                <strong className="ml-2">Average Attendance Rate:</strong>{' '}
                {monthlyAttendance.length > 0 
                  ? Math.round(monthlyAttendance.reduce((sum, s) => sum + s.attendanceRate, 0) / monthlyAttendance.length)
                  : 0}%
              </p>
            </div>
          </div>
        </>
      )}

      {/* SF2 Attendance Form Modal */}
      <SF2AttendanceForm
        isOpen={showSF2Modal}
        onClose={() => setShowSF2Modal(false)}
        attendanceData={monthlyAttendance}
        students={students}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedSection={selectedSection}
      />
    </div>
  );
}