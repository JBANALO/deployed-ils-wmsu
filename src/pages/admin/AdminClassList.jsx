import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { UsersIcon, MagnifyingGlassIcon, PrinterIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";

export default function AdminClassList() {
  const { id } = useParams();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState({ id: "", grade: "", section: "", adviserName: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const searchParams = new URLSearchParams(location.search || '');
  const selectedSchoolYearId = String(searchParams.get('schoolYearId') || '').trim();
  const queryGrade = String(searchParams.get('grade') || '').trim();
  const querySection = String(searchParams.get('section') || '').trim();

  const normalizeText = (value) => String(value || '').trim().toLowerCase();
  const matchesGradeSection = (row, grade, section) => (
    normalizeText(row?.grade || row?.gradeLevel || row?.grade_level) === normalizeText(grade)
      && normalizeText(row?.section) === normalizeText(section)
  );

  const filteredStudents = students.filter((student) => {
    const fullName = String(student.fullName || `${student.firstName || ''} ${student.lastName || ''}`)
      .trim()
      .toLowerCase();
    const lrn = String(student.lrn || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || lrn.includes(query);
  });

  // Print class list function
  const handlePrintClassList = () => {
    const printContent = `
      <html>
        <head>
          <title>Class List - ${classInfo.grade} ${classInfo.section}</title>
          <style>
            body {
              font-family: 'Montserrat', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin-bottom: 15px;
            }
            .school-name {
              font-size: 18px;
              font-weight: bold;
              color: #7f1d1d;
              margin-bottom: 5px;
            }
            .system-name {
              font-size: 14px;
              color: #666;
              margin-bottom: 20px;
            }
            .class-info {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .teacher-info {
              font-size: 16px;
              color: #666;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px;
              border: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              color: #333;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .no-students {
              text-align: center;
              padding: 40px;
              color: #666;
              font-style: italic;
            }
            @media print {
              body { margin: 0; }
              .header { margin-bottom: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/wmsu-logo.jpg" alt="WMSU Logo" class="logo" />
            <div class="school-name">WMSU ILS-Elementary Department</div>
            <div class="system-name">Automated Grades Portal and Students Attendance using QR Code</div>
            <div class="class-info">${classInfo.grade} - ${classInfo.section} Class List</div>
            ${classInfo.adviserName ? `<div class="teacher-info">Adviser: ${classInfo.adviserName}</div>` : ''}
          </div>
          
          ${filteredStudents.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>LRN</th>
                  <th>Sex</th>
                  <th>Grade Level</th>
                  <th>Section</th>
                </tr>
              </thead>
              <tbody>
                ${filteredStudents.map((student) => `
                  <tr>
                    <td>${student.fullName || `${student.firstName || ''} ${student.lastName || ''}`}</td>
                    <td>${student.lrn || 'N/A'}</td>
                    <td>${student.sex || 'N/A'}</td>
                    <td>${student.gradeLevel || classInfo.grade}</td>
                    <td>${student.section || classInfo.section}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-students">No students in this class yet.</div>'}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Resolve class and fetch students in that class for the selected school year.
  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true);

        const requestParams = selectedSchoolYearId
          ? { schoolYearId: selectedSchoolYearId }
          : {};

        const classResponse = await axios.get('/classes', { params: requestParams });
        const classRows = Array.isArray(classResponse.data)
          ? classResponse.data
          : (Array.isArray(classResponse.data?.data) ? classResponse.data.data : []);

        const decodedClassRef = decodeURIComponent(String(id || '')).trim();
        let selectedClass = classRows.find((row) => String(row?.id || '').trim() === decodedClassRef) || null;

        // Backward compatibility for legacy links that still pass index.
        if (!selectedClass && /^\d+$/.test(decodedClassRef)) {
          const legacyIndex = Number(decodedClassRef);
          if (legacyIndex >= 0 && legacyIndex < classRows.length) {
            selectedClass = classRows[legacyIndex];
          }
        }

        let resolvedGrade = queryGrade;
        let resolvedSection = querySection;

        if (!selectedClass && decodedClassRef.toLowerCase().startsWith('gs:')) {
          const rawPair = decodedClassRef.slice(3);
          const pairSplit = rawPair.split('::');
          resolvedGrade = pairSplit[0] || resolvedGrade;
          resolvedSection = pairSplit.slice(1).join('::') || resolvedSection;
        }

        if (!selectedClass && resolvedGrade && resolvedSection) {
          selectedClass = classRows.find((row) => matchesGradeSection(row, resolvedGrade, resolvedSection)) || null;
        }

        resolvedGrade = String(selectedClass?.grade || selectedClass?.gradeLevel || resolvedGrade || '').trim();
        resolvedSection = String(selectedClass?.section || resolvedSection || '').trim();

        setClassInfo({
          id: String(selectedClass?.id || decodedClassRef || ''),
          grade: resolvedGrade,
          section: resolvedSection,
          adviserName: String(selectedClass?.adviser_name || '').trim()
        });

        if (!resolvedGrade || !resolvedSection) {
          setStudents([]);
          return;
        }

        const studentResponse = await axios.get('/students', { params: requestParams });
        const studentRows = Array.isArray(studentResponse.data)
          ? studentResponse.data
          : (Array.isArray(studentResponse.data?.data) ? studentResponse.data.data : []);

        const classStudents = studentRows.filter((student) =>
          matchesGradeSection(
            { grade: student?.gradeLevel || student?.grade_level, section: student?.section },
            resolvedGrade,
            resolvedSection
          )
        );

        setStudents(classStudents);
      } catch (error) {
        console.error('Error fetching class data:', error);
        setStudents([]);
        setClassInfo({ id: '', grade: queryGrade, section: querySection, adviserName: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [id, selectedSchoolYearId, queryGrade, querySection]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <UsersIcon className="w-16 h-16 text-red-800" />
            <div>
              <h2 className="text-4xl font-bold text-gray-900">
                {classInfo.grade} - {classInfo.section} Class List
              </h2>
              {classInfo.adviserName && (
                <p className="text-gray-600 mt-2">Adviser: <span className="font-semibold">{classInfo.adviserName}</span></p>
              )}
            </div>
          </div>
          <button
            onClick={handlePrintClassList}
            className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
            Print Class List
          </button>
        </div>
        <p className="text-gray-600">Showing all students enrolled in this class.</p>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by student name, LRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
          />
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            Loading class list...
          </div>
        ) : students.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No students in this class yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border-b">Student Name</th>
                <th className="p-3 border-b">LRN</th>
                <th className="p-3 border-b">Sex</th>
                <th className="p-3 border-b">Grade Level</th>
                <th className="p-3 border-b">Section</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="p-3 border-b font-semibold">{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                  <td className="p-3 border-b">{student.lrn}</td>
                  <td className="p-3 border-b">{student.sex || 'N/A'}</td>
                  <td className="p-3 border-b">{student.gradeLevel}</td>
                  <td className="p-3 border-b">{student.section}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
