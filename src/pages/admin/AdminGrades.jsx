import React, { useState, useEffect } from "react";
import { ClipboardDocumentIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";

export default function AdminGrades() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [sections, setSections] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    loadGradesData();
  }, []);

  const loadGradesData = async () => {
    try {
      setLoading(true);

      // Fetch students with grades
      const studentsRes = await axios.get('/students');
      const studentsData = Array.isArray(studentsRes.data.data) ? studentsRes.data.data : 
                           Array.isArray(studentsRes.data) ? studentsRes.data : [];

      // Sort by average (highest first) and calculate rank
      const sortedStudents = studentsData
        .filter(s => s.average && s.average > 0)
        .sort((a, b) => (b.average || 0) - (a.average || 0))
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));

      // Include students without grades at the end
      const studentsWithoutGrades = studentsData
        .filter(s => !s.average || s.average === 0)
        .map(student => ({ ...student, rank: '-' }));

      setStudents([...sortedStudents, ...studentsWithoutGrades]);

      // Extract unique sections
      const uniqueSections = [...new Set(studentsData.map(s => `${s.gradeLevel} - ${s.section}`))].filter(s => s !== 'undefined - undefined');
      setSections(uniqueSections.sort());

      // Generate recent updates from students with grades
      const updates = sortedStudents.slice(0, 5).map(s => ({
        name: s.fullName || `${s.firstName} ${s.lastName}`,
        subject: 'General Average',
        grade: s.average
      }));
      setRecentUpdates(updates);

      setLoading(false);
    } catch (error) {
      console.error('Error loading grades:', error);
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchQuery || 
      student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lrn?.includes(searchQuery);

    const matchesSection = selectedSection === 'All' || 
      `${student.gradeLevel} - ${student.section}` === selectedSection;

    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <ClipboardDocumentIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105" />
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Grades Management</h2>
        </div>
      </div>

      <p className="text-gray-600">
        Monitor, update, verify, and review student grades across all subjects. Teachers input grades, 
        and the system automatically computes the final average and ranking.
      </p>

      <div className="bg-red-50 p-6 rounded-lg border border-red-100">
        <h3 className="text-xl font-semibold text-red-800 mb-3">Top Performing Students</h3>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : recentUpdates.length === 0 ? (
          <p className="text-gray-500">No grade records found</p>
        ) : (
          <ul className="text-gray-700 text-sm list-disc ml-5 space-y-1">
            {recentUpdates.map((update, index) => (
              <li key={index}>
                <span className="font-semibold">{update.name}</span> — {update.subject}: <span className="text-green-700 font-bold">{update.grade}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 mt-6">
        <div className="flex justify-between items-center p-4 border-b flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-gray-800">All Students Grades</h3>
          <div className="flex items-center gap-4">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-800"
            >
              <option value="All">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border rounded-lg w-64 outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">LRN</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Section</th>
                <th className="p-4">Final Average</th>
                <th className="p-4">Rank</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">Loading grades data...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">No students found</td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.id || index} className="border-b hover:bg-gray-50">
                    <td className="p-4">{student.lrn || 'N/A'}</td>
                    <td className="p-4">{student.fullName || `${student.firstName || ''} ${student.lastName || ''}`}</td>
                    <td className="p-4">{student.gradeLevel} - {student.section}</td>
                    <td className="p-4 font-semibold">
                      {student.average ? (
                        <span className={student.average >= 90 ? 'text-green-600' : student.average >= 75 ? 'text-blue-600' : 'text-red-600'}>
                          {student.average}
                        </span>
                      ) : (
                        <span className="text-gray-400">No grades</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold">
                      {student.rank !== '-' ? (
                        <span className={student.rank <= 3 ? 'text-yellow-600' : 'text-gray-700'}>
                          {student.rank <= 3 ? `🏆 ${student.rank}` : student.rank}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 flex justify-center gap-4">
                      <EyeIcon className="w-6 h-6 text-blue-600 cursor-pointer hover:text-blue-800" title="View Details" />
                      <PencilSquareIcon className="w-6 h-6 text-green-600 cursor-pointer hover:text-green-800" title="Edit Grades" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="p-4 border-t bg-gray-50 text-gray-600 text-sm">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>
    </div>
  );
}
