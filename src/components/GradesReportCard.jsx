import React, { useRef, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export default function GradesReportCard({ students, quarter, gradeLevel, section, classId, onClose }) {
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const quarterLabels = {
    q1: 'FIRST QUARTER',
    q2: 'SECOND QUARTER',
    q3: 'THIRD QUARTER',
    q4: 'FOURTH QUARTER'
  };

  // Fallback subjects by grade (only used if class subjects not found)
  const subjectsByGrade = {
    "Kindergarten": ["Reading", "Writing", "Math Readiness", "Arts", "Physical Education"],
    "Grade 1": ["Mathematics", "English", "Filipino", "Science", "Araling Panlipunan", "MAPEH"],
    "Grade 2": ["Mathematics", "English", "Filipino", "Science", "Araling Panlipunan", "MAPEH"],
    "Grade 3": ["Mathematics", "English", "Filipino", "Science", "Araling Panlipunan", "MAPEH"],
  };

  // Fetch class subjects when component mounts
  useEffect(() => {
    const fetchClassSubjects = async () => {
      try {
        setLoading(true);
        if (classId) {
          // If classId is provided, fetch subjects for that class
          const response = await api.get(`/classes/${classId}/subjects`);
          setClassSubjects(response.data.subjects || []);
        } else if (gradeLevel && gradeLevel !== 'All Grades') {
          // Fallback to hardcoded subjects if no classId
          setClassSubjects(subjectsByGrade[gradeLevel] || []);
        } else {
          // Use all subjects from all grades
          const allSubjects = [...new Set(Object.values(subjectsByGrade).flat())];
          setClassSubjects(allSubjects);
        }
      } catch (error) {
        console.error('Error fetching class subjects:', error);
        // Fallback to hardcoded subjects on error
        setClassSubjects(subjectsByGrade[gradeLevel] || []);
      } finally {
        setLoading(false);
      }
    };

    fetchClassSubjects();
  }, [classId, gradeLevel]);

  const subjects = classSubjects.length > 0 ? classSubjects : (subjectsByGrade[gradeLevel] || []);
  const today = new Date().toLocaleDateString();
  const currentYear = new Date().getFullYear();

  const handlePrint = () => {
    window.print();
  };

  const getQuarterNumber = () => {
    const map = { q1: '1st', q2: '2nd', q3: '3rd', q4: '4th' };
    return map[quarter] || '1st';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header with buttons */}
        <div className="sticky top-0 bg-gray-50 border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">DepED Report Cards (Per Student)</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🖨️ Print All
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>

        {/* Report Cards */}
        <div className="p-8 print:p-0 bg-white" id="report-card">
          {students.map((student, studentIndex) => {
            const gradeObj = student.grades || {};
            // Use student's actual grade level
            const studentGradeLevel = student.gradeLevel || gradeLevel;
            const studentSubjects = subjectsByGrade[studentGradeLevel] || subjectsByGrade["Grade 1"] || [];
            
            return (
              <div key={student.id} className="mb-12 page-break">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-4 border-b-2 pb-2">
                  <div className="text-center flex-1">
                    <p className="text-xs font-bold">Republic of the Philippines</p>
                    <p className="text-xs font-bold">Department of Education</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs font-bold">DepED</p>
                  </div>
                </div>

                <h2 className="text-center text-sm font-bold mb-4">REPORT CARD</h2>

                {/* Student Information */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <p><span className="font-bold">Name:</span> {student.fullName || `${student.firstName} ${student.lastName}`}</p>
                    <p><span className="font-bold">LRN:</span> {student.lrn || 'N/A'}</p>
                  </div>
                  <div>
                    <p><span className="font-bold">School:</span> WMSU ILS - Elementary Department</p>
                    <p><span className="font-bold">School ID:</span> _______________</p>
                  </div>
                  <div>
                    <p><span className="font-bold">Grade:</span> {studentGradeLevel}</p>
                    <p><span className="font-bold">School Year:</span> {currentYear}-{currentYear + 1}</p>
                  </div>
                  <div>
                    <p><span className="font-bold">Section:</span> {student.section || section}</p>
                    <p><span className="font-bold">Class Adviser:</span> _______________</p>
                  </div>
                </div>

                {/* PERIODIC RATING Table - DepED Form 138-E Format */}
                <div className="mb-6">
                  <h3 className="text-center text-sm font-bold mb-2">PERIODIC RATING</h3>
                  <table className="w-full border-collapse border-2 border-gray-900 text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-gray-900 p-2 text-center font-bold" rowSpan="2">LEARNING AREAS</th>
                        <th className="border-2 border-gray-900 p-1 text-center font-bold" colSpan="4">Quarter</th>
                        <th className="border-2 border-gray-900 p-2 text-center font-bold" rowSpan="2">FINAL<br/>RATING</th>
                      </tr>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-gray-900 p-1 text-center font-bold w-12">1</th>
                        <th className="border-2 border-gray-900 p-1 text-center font-bold w-12">2</th>
                        <th className="border-2 border-gray-900 p-1 text-center font-bold w-12">3</th>
                        <th className="border-2 border-gray-900 p-1 text-center font-bold w-12">4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentSubjects.map((subject, idx) => {
                        // ALWAYS show grades that exist in database
                        const q1Val = gradeObj[subject]?.q1 || '';
                        const q2Val = gradeObj[subject]?.q2 || '';
                        const q3Val = gradeObj[subject]?.q3 || '';
                        const q4Val = gradeObj[subject]?.q4 || '';
                        
                        // Calculate final rating from all available quarters
                        const allGrades = [q1Val, q2Val, q3Val, q4Val]
                          .map(g => parseFloat(g))
                          .filter(g => !isNaN(g) && g > 0);
                        
                        const finalRating = allGrades.length > 0 
                          ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
                          : '';

                        return (
                          <tr key={idx}>
                            <td className="border-2 border-gray-900 p-2 text-left">{subject}</td>
                            <td className="border-2 border-gray-900 p-2 text-center" style={{minHeight: '30px'}}>
                              {q1Val ? Math.round(parseFloat(q1Val)) : ''}
                            </td>
                            <td className="border-2 border-gray-900 p-2 text-center" style={{minHeight: '30px'}}>
                              {q2Val ? Math.round(parseFloat(q2Val)) : ''}
                            </td>
                            <td className="border-2 border-gray-900 p-2 text-center" style={{minHeight: '30px'}}>
                              {q3Val ? Math.round(parseFloat(q3Val)) : ''}
                            </td>
                            <td className="border-2 border-gray-900 p-2 text-center" style={{minHeight: '30px'}}>
                              {q4Val ? Math.round(parseFloat(q4Val)) : ''}
                            </td>
                            <td className="border-2 border-gray-900 p-2 text-center font-bold">
                              {finalRating}
                            </td>
                          </tr>
                        );
                      })}
                      {/* AVERAGE row */}
                      <tr>
                        <td className="border-2 border-gray-900 p-2 text-left font-bold">AVERAGE</td>
                        <td className="border-2 border-gray-900 p-2 text-center"></td>
                        <td className="border-2 border-gray-900 p-2 text-center"></td>
                        <td className="border-2 border-gray-900 p-2 text-center"></td>
                        <td className="border-2 border-gray-900 p-2 text-center"></td>
                        <td className="border-2 border-gray-900 p-2 text-center font-bold">
                          {student.average || ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Promoted/Retained Section */}
                <div className="border border-gray-800 p-2 mb-4 text-xs">
                  <p>☐ PROMOTED TO GRADE _____ &nbsp;&nbsp;&nbsp; ☐ RETAINED IN GRADE _____</p>
                  <p className="mt-2">Certificate of Transfer: _____________________________</p>
                </div>

                {/* Signature Section */}
                <div className="grid grid-cols-3 gap-4 mt-8 text-xs">
                  <div>
                    <p className="border-t border-gray-800 text-center pt-2">Prepared by:</p>
                    <p className="text-center text-xs text-gray-600 py-1">Class Adviser</p>
                  </div>
                  <div>
                    <p className="border-t border-gray-800 text-center pt-2">Verified by:</p>
                    <p className="text-center text-xs text-gray-600 py-1">School Administrator</p>
                  </div>
                  <div>
                    <p className="border-t border-gray-800 text-center pt-2">Date:</p>
                    <p className="text-center text-xs text-gray-600 py-1">{today}</p>
                  </div>
                </div>

                {/* Page Break for Print */}
                {studentIndex < students.length - 1 && (
                  <div className="page-break-after border-t-4 border-gray-300 mt-12 pt-8 print:page-break-after"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          #report-card {
            margin: 0;
            padding: 0;
          }
          .page-break-after {
            page-break-after: always;
          }
          .print\\:page-break-after {
            page-break-after: always;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
