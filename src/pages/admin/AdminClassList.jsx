import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UsersIcon, MagnifyingGlassIcon, PrinterIcon } from "@heroicons/react/24/solid";
import { API_BASE_URL } from "../../api/config";

export default function AdminClassList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState({ grade: "", section: "" });
  const [allClasses, setAllClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [teacher, setTeacher] = useState(null);

  // Print class list function
  const handlePrintClassList = () => {
    const filteredStudents = students.filter((student) => {
      const fullName = (student.fullName || `${student.firstName} ${student.lastName}`).toLowerCase();
      const lrn = (student.lrn || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || lrn.includes(query);
    });

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
            ${teacher ? `<div class="teacher-info">Adviser: ${teacher.firstName} ${teacher.lastName}</div>` : ''}
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

  // Fetch all students and teachers
  useEffect(() => {
    const fetchClassData = async () => {
      try {
        // Fetch students
        const response = await fetch(`${API_BASE_URL}/students`);
        if (response.ok) {
          const result = await response.json();
          const allStudents = result.data ? result.data : (Array.isArray(result) ? result : []);
          
          // Organize by grade and section
          const gradeOrder = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
          const sectionOrder = ['Wisdom', 'Kindness', 'Humility', 'Diligence'];
          const grouped = {};

          allStudents.forEach(student => {
            const key = `${student.gradeLevel}-${student.section}`;
            if (!grouped[key]) {
              grouped[key] = {
                grade: student.gradeLevel,
                section: student.section,
                studentList: []
              };
            }
            grouped[key].studentList.push(student);
          });

          const classes = Object.values(grouped)
            .sort((a, b) => {
              const gradeCompare = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
              if (gradeCompare !== 0) return gradeCompare;
              return sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
            });

          setAllClasses(classes);
          
          // Get the specific class by index
          const classIndex = parseInt(id) || 0;
          if (classIndex < classes.length) {
            const selectedClass = classes[classIndex];
            setClassInfo({ grade: selectedClass.grade, section: selectedClass.section });
            setStudents(selectedClass.studentList || []);
          }
        }

        // Fetch teachers
        const teachersResponse = await fetch(`${API_BASE_URL}/users`);
        if (teachersResponse.ok) {
          const data = await teachersResponse.json();
          const allUsers = data.data?.users || data.users || [];
          const teachersList = Array.isArray(allUsers) 
            ? allUsers.filter(user => ['teacher', 'subject_teacher', 'adviser'].includes(user.role))
            : [];
          
          // Find teacher for this class
          const classIndex = parseInt(id) || 0;
          if (classIndex < setAllClasses.length || setAllClasses.length > 0) {
            // This will be set after classInfo is determined
            const foundTeacher = teachersList.find(t => {
              // Will be checked after classInfo state is updated
              return true;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching class data:', error);
        setStudents([]);
      }
      setLoading(false);
    };

    fetchClassData();
  }, [id]);

  // Fetch teacher for the current class
  useEffect(() => {
    const fetchTeacher = async () => {
      if (!classInfo.grade || !classInfo.section) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (response.ok) {
          const data = await response.json();
          const allUsers = data.data?.users || data.users || [];
          const teachersList = Array.isArray(allUsers) 
            ? allUsers.filter(user => ['teacher', 'subject_teacher', 'adviser'].includes(user.role))
            : [];
          
          const foundTeacher = teachersList.find(t => 
            t.gradeLevel === classInfo.grade && t.section === classInfo.section
          );
          setTeacher(foundTeacher || null);
        }
      } catch (error) {
        console.error('Error fetching teacher:', error);
        setTeacher(null);
      }
    };

    fetchTeacher();
  }, [classInfo]);

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
              {teacher && (
                <p className="text-gray-600 mt-2">Adviser: <span className="font-semibold">{teacher.firstName} {teacher.lastName}</span></p>
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
              {students
                .filter((student) => {
                  const fullName = (student.fullName || `${student.firstName} ${student.lastName}`).toLowerCase();
                  const lrn = (student.lrn || "").toLowerCase();
                  const query = searchQuery.toLowerCase();
                  return fullName.includes(query) || lrn.includes(query);
                })
                .map((student) => (
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
