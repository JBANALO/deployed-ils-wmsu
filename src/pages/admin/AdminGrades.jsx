import React, { useState, useEffect } from "react";
import { ClipboardDocumentIcon, PencilSquareIcon, MagnifyingGlassIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import { toast } from 'react-toastify';
import { useSchoolYear } from "../../context/SchoolYearContext";

// DepEd K-12 Subjects
const DEPED_SUBJECTS = {
  "Kindergarten": ["Filipino", "English", "Mathematics", "Values Education", "Music", "Arts", "Physical Education"],
  "Grade 1": ["Filipino", "English", "Mathematics", "Science", "Social Studies", "Values Education", "Music", "Arts", "Physical Education", "Computer"],
  "Grade 2": ["Filipino", "English", "Mathematics", "Science", "Social Studies", "Values Education", "Music", "Arts", "Physical Education", "Computer"],
  "Grade 3": ["Filipino", "English", "Mathematics", "Science", "Social Studies", "Values Education", "Music", "Arts", "Physical Education", "Computer"],
  "Grade 4": ["Filipino", "English", "Mathematics", "Science", "Social Studies", "Values Education", "Music", "Arts", "Physical Education", "Computer"],
  "Grade 5": ["Filipino", "English", "Mathematics", "Science", "Social Studies", "Values Education", "Music", "Arts", "Physical Education", "Computer"],
  "Grade 6": ["Filipino", "English", "Mathematics", "Science", "Social Studies", "Values Education", "Music", "Arts", "Physical Education", "Computer"],
};

const normalizeSubjectName = (value) => String(value || '')
  .replace(/\s*\(Grade\s+\d+\)\s*$/i, '')
  .replace(/\s*\(Kindergarten\)\s*$/i, '')
  .trim()
  .toLowerCase();

export default function AdminGrades() {
    const { isViewingLocked } = useSchoolYear();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('All');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState({});
  const [editGrades, setEditGrades] = useState({});
  const [selectedQuarter, setSelectedQuarter] = useState('q1');
  const [saving, setSaving] = useState(false);
  const [subjectsByGrade, setSubjectsByGrade] = useState({});



  useEffect(() => {
    loadGradesData();
  }, []);

  const loadGradesData = async () => {
    try {
      setLoading(true);

      // Fetch ALL students (with and without grades)
      const studentsRes = await axios.get('/students');
      const studentsData = Array.isArray(studentsRes.data.data) ? studentsRes.data.data : 
                           Array.isArray(studentsRes.data) ? studentsRes.data : [];

      // Sort by average (highest first) and calculate rank - with grades first
      const sortedStudents = studentsData
        .filter(s => s.average && s.average > 0)
        .sort((a, b) => (b.average || 0) - (a.average || 0))
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));

      // Include students without grades at the end (ALL of them)
      const studentsWithoutGrades = studentsData
        .filter(s => !s.average || s.average === 0)
        .map(student => ({ ...student, rank: '-' }));

      // Combine: students with grades first, then students without
      const allStudents = [...sortedStudents, ...studentsWithoutGrades];
      setStudents(allStudents);

      // Load subjects configured by admin for each grade present in students list
      const uniqueGrades = [...new Set(allStudents.map(s => s.gradeLevel).filter(Boolean))];
      const subjectMap = {};
      await Promise.all(uniqueGrades.map(async (gradeLabel) => {
        try {
          const gradeKey = String(gradeLabel).replace(/^Grade\s+/i, '').trim();
          const subjRes = await axios.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`);
          const names = (subjRes.data?.data || []).map(s => s.name).filter(Boolean);
          if (names.length > 0) subjectMap[gradeLabel] = names;
        } catch (e) {
          // Keep fallback list if subject API fails for this grade
        }
      }));
      if (Object.keys(subjectMap).length > 0) {
        setSubjectsByGrade(subjectMap);
      }

      // Extract unique grade levels from ALL students
      const uniqueGradeLevels = [...new Set(allStudents.map(s => s.gradeLevel).filter(Boolean))];
      setGradeLevels(uniqueGradeLevels.sort((a, b) => {
        const gradeA = parseInt(String(a).replace(/\D/g, ''), 10);
        const gradeB = parseInt(String(b).replace(/\D/g, ''), 10);
        return (Number.isNaN(gradeA) ? 0 : gradeA) - (Number.isNaN(gradeB) ? 0 : gradeB);
      }));

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
      toast.error('Failed to load grades data');
      setLoading(false);
    }
  };

  // Fetch grades for a specific student
  const fetchStudentGrades = async (student) => {
    try {
      const response = await axios.get(`/students/${student.id}/grades`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching student grades:', error);
      return {};
    }
  };

  // View student grades
  const handleViewGrades = async (student) => {
    setSelectedStudent(student);
    const grades = await fetchStudentGrades(student);
    setStudentGrades(grades);
    setShowViewModal(true);
  };

  const getSubjectsForStudent = (student) => {
    const grade = student?.gradeLevel;
    return subjectsByGrade[grade] || DEPED_SUBJECTS[grade] || DEPED_SUBJECTS['Grade 1'];
  };

  const getMatchedGrade = (gradesObj, subjectName) => {
    if (gradesObj[subjectName]) return gradesObj[subjectName];
    const normalized = normalizeSubjectName(subjectName);
    const key = Object.keys(gradesObj).find(k => normalizeSubjectName(k) === normalized);
    return key ? gradesObj[key] : {};
  };

  // Edit student grades  
  const handleEditGrades = async (student) => {
        if (isViewingLocked) {
          toast.error('Previous school years are view-only. Switch to the active year to edit grades.');
          return;
        }
    setSelectedStudent(student);
    const grades = await fetchStudentGrades(student);
    
    // Initialize edit grades with existing or empty values for all subjects
    const subjects = getSubjectsForStudent(student);
    const initialGrades = {};
    subjects.forEach(subject => {
      const matchedGrade = getMatchedGrade(grades, subject);
      if (Object.keys(matchedGrade).length > 0) {
        initialGrades[subject] = matchedGrade.q1 || matchedGrade.q2 || matchedGrade.q3 || matchedGrade.q4 || 0;
      } else {
        initialGrades[subject] = 0;
      }
    });
    
    setStudentGrades(grades);
    setEditGrades(initialGrades);
    setShowEditModal(true);
  };

  // Save grades
  const handleSaveGrades = async () => {
        if (isViewingLocked) {
          toast.error('Previous school years are view-only. Switch to the active year to edit grades.');
          return;
        }
    if (!selectedStudent) return;
    
    setSaving(true);
    try {
      // Calculate average
      const gradeValues = Object.values(editGrades).filter(g => g > 0);
      const average = gradeValues.length > 0 
        ? gradeValues.reduce((a, b) => a + parseFloat(b), 0) / gradeValues.length 
        : 0;

      const response = await axios.put(`/students/${selectedStudent.id}/grades`, {
        grades: editGrades,
        quarter: selectedQuarter,
        average: average.toFixed(2)
      });

      if (response.data.success) {
        toast.success(`Grades saved for ${selectedQuarter.toUpperCase()}`);
        setShowEditModal(false);
        loadGradesData(); // Refresh data
      } else {
        toast.error(response.data.message || 'Failed to save grades');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error(error.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // Handle grade input change
  const handleGradeChange = (subject, value) => {
    const numValue = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setEditGrades(prev => ({ ...prev, [subject]: numValue }));
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchQuery || 
      student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lrn?.includes(searchQuery);

    const matchesGradeLevel = selectedGradeLevel === 'All' || 
      student.gradeLevel === selectedGradeLevel;

    return matchesSearch && matchesGradeLevel;
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

              value={selectedGradeLevel}

              onChange={(e) => setSelectedGradeLevel(e.target.value)}

              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-800"

            >

              <option value="All">All Grade Levels</option>

              {gradeLevels.map((gradeLevel) => (

                <option key={gradeLevel} value={gradeLevel}>{gradeLevel}</option>

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
                      <EyeIcon 
                        className="w-6 h-6 text-blue-600 cursor-pointer hover:text-blue-800" 
                        title="View Grades" 
                        onClick={() => handleViewGrades(student)}
                      />
                      <PencilSquareIcon 
                        className="w-6 h-6 text-green-600 cursor-pointer hover:text-green-800" 
                        title="Edit Grades"
                        onClick={() => handleEditGrades(student)}
                      />
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

      {/* View Grades Modal */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center p-4 border-b bg-red-800 text-white rounded-t-lg">
              <h3 className="text-xl font-bold">View Grades</h3>
              <XMarkIcon className="w-6 h-6 cursor-pointer hover:text-gray-300" onClick={() => setShowViewModal(false)} />
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-lg font-semibold">{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                <p className="text-gray-600">LRN: {selectedStudent.lrn} | {selectedStudent.gradeLevel} - {selectedStudent.section}</p>
              </div>

              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Subject</th>
                    <th className="border p-2 text-center">Q1</th>
                    <th className="border p-2 text-center">Q2</th>
                    <th className="border p-2 text-center">Q3</th>
                    <th className="border p-2 text-center">Q4</th>
                    <th className="border p-2 text-center">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {getSubjectsForStudent(selectedStudent).map(subject => {
                    const grade = getMatchedGrade(studentGrades, subject);
                    const avg = grade.average || ((grade.q1 || 0) + (grade.q2 || 0) + (grade.q3 || 0) + (grade.q4 || 0)) / 4;
                    return (
                      <tr key={subject}>
                        <td className="border p-2">{subject}</td>
                        <td className="border p-2 text-center">{grade.q1 || '-'}</td>
                        <td className="border p-2 text-center">{grade.q2 || '-'}</td>
                        <td className="border p-2 text-center">{grade.q3 || '-'}</td>
                        <td className="border p-2 text-center">{grade.q4 || '-'}</td>
                        <td className="border p-2 text-center font-semibold">
                          {avg ? avg.toFixed(2) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border p-2" colSpan="5">General Average</td>
                    <td className="border p-2 text-center text-green-600">
                      {selectedStudent.average || '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Grades Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center p-4 border-b bg-green-700 text-white rounded-t-lg">
              <h3 className="text-xl font-bold">Edit Grades</h3>
              <XMarkIcon className="w-6 h-6 cursor-pointer hover:text-gray-300" onClick={() => setShowEditModal(false)} />
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-lg font-semibold">{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                <p className="text-gray-600">LRN: {selectedStudent.lrn} | {selectedStudent.gradeLevel} - {selectedStudent.section}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Quarter:</label>
                <select 
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="border rounded px-3 py-2 w-full max-w-xs"
                >
                  <option value="q1">1st Quarter</option>
                  <option value="q2">2nd Quarter</option>
                  <option value="q3">3rd Quarter</option>
                  <option value="q4">4th Quarter</option>
                </select>
              </div>

              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Subject</th>
                    <th className="border p-2 text-center">Current Grade</th>
                    <th className="border p-2 text-center">New Grade ({selectedQuarter.toUpperCase()})</th>
                  </tr>
                </thead>
                <tbody>
                  {getSubjectsForStudent(selectedStudent).map(subject => {
                    const currentGrade = getMatchedGrade(studentGrades, subject)?.[selectedQuarter] || '-';
                    return (
                      <tr key={subject}>
                        <td className="border p-2">{subject}</td>
                        <td className="border p-2 text-center">{currentGrade}</td>
                        <td className="border p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editGrades[subject] || ''}
                            onChange={(e) => handleGradeChange(subject, e.target.value)}
                            className="border rounded px-2 py-1 w-20 text-center"
                            placeholder="0-100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                onClick={handleSaveGrades}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Grades'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

