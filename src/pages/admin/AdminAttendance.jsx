import React, { useState, useEffect } from "react";
import { ClipboardDocumentCheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      // Fetch students
      const studentsRes = await axios.get('/students');
      const studentsData = Array.isArray(studentsRes.data.data) ? studentsRes.data.data : 
                           Array.isArray(studentsRes.data) ? studentsRes.data : [];
      setStudents(studentsData);

      // Fetch attendance
      const attendanceRes = await axios.get('/attendance');
      const allAttendance = Array.isArray(attendanceRes.data.data) ? attendanceRes.data.data : 
                           Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

      // Filter by selected date
      const dateAttendance = allAttendance.filter(a => a.date === selectedDate);
      setAttendance(dateAttendance);

      // Calculate stats
      const present = dateAttendance.filter(a => a.status?.toLowerCase() === 'present').length;
      const absent = dateAttendance.filter(a => a.status?.toLowerCase() === 'absent').length;
      const late = dateAttendance.filter(a => a.status?.toLowerCase() === 'late').length;
      setStats({ present, absent, late });

      setLoading(false);
    } catch (error) {
      console.error('Error loading attendance:', error);
      setLoading(false);
    }
  };

  // Filter attendance by search
  const filteredAttendance = attendance.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.studentName?.toLowerCase().includes(query) ||
      record.studentId?.toLowerCase().includes(query) ||
      record.section?.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'text-green-700';
      case 'absent': return 'text-red-700';
      case 'late': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <ClipboardDocumentCheckIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105" />
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Attendance Monitoring</h2>
        </div>
      </div>

      <p className="text-gray-600">
        Track daily attendance, verify scanned QR codes from teachers, and monitor absence notifications sent to parents.
      </p>

      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <label className="font-semibold text-gray-700">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
        />
      </div>

      <div className="bg-red-50 p-6 rounded-lg border border-red-100">
        <h3 className="text-xl font-semibold text-red-800 mb-3">
          {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Summary" : `Summary for ${selectedDate}`}
        </h3>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <ul className="text-gray-700 text-sm list-disc ml-5 space-y-1">
            <li>Present: <span className="font-bold text-green-700">{stats.present.toLocaleString()}</span> students</li>
            <li>Absent: <span className="font-bold text-red-700">{stats.absent.toLocaleString()}</span> students</li>
            <li>Late: <span className="font-bold text-yellow-600">{stats.late.toLocaleString()}</span> students</li>
          </ul>
        )}
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 mt-6">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Daily Attendance List</h3>
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search LRN or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 border rounded-lg w-64 outline-none focus:ring-2 focus:ring-red-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">LRN</th>
                <th className="p-4">Name</th>
                <th className="p-4">Grade & Section</th>
                <th className="p-4">Status</th>
                <th className="p-4">Time In</th>
                <th className="p-4">Location</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">Loading attendance data...</td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">No attendance records found for this date</td>
                </tr>
              ) : (
                filteredAttendance.map((record, index) => (
                  <tr key={record.id || index} className="border-b hover:bg-gray-50">
                    <td className="p-4">{record.studentId || 'N/A'}</td>
                    <td className="p-4">{record.studentName || 'Unknown'}</td>
                    <td className="p-4">{record.gradeLevel} - {record.section}</td>
                    <td className={`p-4 font-semibold ${getStatusColor(record.status)}`}>
                      {record.status || 'N/A'}
                    </td>
                    <td className="p-4">{record.time || '—'}</td>
                    <td className="p-4">{record.location || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination info */}
        <div className="p-4 border-t bg-gray-50 text-gray-600 text-sm">
          Showing {filteredAttendance.length} of {attendance.length} records
        </div>
      </div>
    </div>
  );
}
