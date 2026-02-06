import React, { useState, useEffect } from "react";
import {
  BookOpenIcon,
  UsersIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import QRCode from "qrcode";
import ViewStudentModal from '@/components/modals/ViewStudentModal'
import EditStudentModal from '@/components/modals/EditStudentModal'
import DeleteRequestModal from '@/components/modals/DeleteRequestModal'
import { API_BASE_URL } from '../../api/config';

export default function GradeLevel() {
  const [students, setStudents] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [deleteReason, setDeleteReason] = useState("");
  const [viewingClass, setViewingClass] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current user from localStorage
      let user = null;
      const userStr = localStorage.getItem("user");
      
      if (userStr) {
        try {
          user = JSON.parse(userStr);
          console.log('User loaded from localStorage:', user);
        } catch (e) {
          console.error('Failed to parse user from localStorage:', e);
        }
      }

      console.log('Current user ID:', user?.id);

      if (!user?.id) {
        console.error("No user found in localStorage");
        setLoading(false);
        return;
      }

      // Fetch students (optional, do not block class display if fails)
      try {
        console.log('🔄 Fetching students from API...');
        const response = await fetch(`${API_BASE_URL}/students`);
        console.log('📡 Students API response status:', response.status);
        if (response.ok) {
          const result = await response.json();
          console.log('📋 API result structure:', Object.keys(result));
          const data = result.data || result; // Handle both structures
          console.log(`✅ Fetched ${data.length} students from API:`, data.slice(0, 2));
          setStudents(data);
        } else {
          console.error('❌ Student API not available, status:', response.status);
          console.error('❌ Response:', await response.text());
        }
      } catch (err) {
        console.error('❌ Student API fetch failed with error:', err);
      }

      // Fetch classes assigned to this adviser
      console.log(`Fetching adviser classes for user: ${user.id}`);
      const classesResponse = await fetch(`${API_BASE_URL}/classes/adviser/${user.id}`);
      let adviserClasses = [];
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        adviserClasses = Array.isArray(classesData.data) ? classesData.data : [];
        console.log(`✓ Adviser classes found: ${adviserClasses.length}`, adviserClasses);
      } else {
        console.error('✗ Adviser classes fetch failed:', classesResponse.status);
        try {
          console.error('  Response:', await classesResponse.text());
        } catch (e) {}
      }

      // Fetch classes assigned to this subject teacher
      console.log(`Fetching subject teacher classes for user: ${user.id}`);
      const subjectTeacherResponse = await fetch(`${API_BASE_URL}/classes/subject-teacher/${user.id}`);
      let subjectTeacherClasses = [];
      if (subjectTeacherResponse.ok) {
        const stData = await subjectTeacherResponse.json();
        subjectTeacherClasses = Array.isArray(stData.data) ? stData.data : [];
        console.log(`✓ Subject teacher classes found: ${subjectTeacherClasses.length}`, subjectTeacherClasses);
      } else {
        console.error('✗ Subject teacher classes fetch failed:', subjectTeacherResponse.status);
        try {
          console.error('  Response:', await subjectTeacherResponse.text());
        } catch (e) {}
      }

      // Combine both adviser and subject teacher classes (remove duplicates)
      const combinedClasses = [...adviserClasses, ...subjectTeacherClasses];
      const uniqueClasses = Array.from(new Map(combinedClasses.map(c => [c.id, c])).values());
      
      console.log('Summary:');
      console.log('  Adviser classes:', adviserClasses.length);
      console.log('  Subject teacher classes:', subjectTeacherClasses.length);
      console.log('  Combined unique classes:', uniqueClasses.length);
      console.log('  Total students:', students.length);
      
      if (uniqueClasses.length > 0) {
        console.log('Classes assigned:', uniqueClasses.map(c => `${c.grade}-${c.section}`).join(', '));
      } else {
        console.log('⚠️  No classes assigned to this user');
      }
      
      setAssignedClasses(uniqueClasses);
      // Debug logs for troubleshooting
      console.log('--- DEBUG: Students from API ---');
      console.log(students);
      console.log('--- DEBUG: Assigned Classes ---');
      console.log(uniqueClasses);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const normalize = str => (str || '').toString().trim().toLowerCase();

  const getStudentsByGrade = (grade) => {
    // Filter students only from assigned classes
    const assignedGradeClasses = assignedClasses.filter(c => normalize(c.grade) === normalize(grade));
    const assignedSections = assignedGradeClasses.map(c => normalize(c.section));
    return students.filter((s) => normalize(s.gradeLevel) === normalize(grade) && assignedSections.includes(normalize(s.section)));
  };

  const getStudentsInSection = (grade, section) => {
    // Filter students robustly by normalizing all values
    const normalizedGrade = normalize(grade);
    const normalizedSection = normalize(section);
    console.log(`🔍 getStudentsInSection called: "${grade}" + "${section}"`);
    console.log(`🔍 Normalized: "${normalizedGrade}" + "${normalizedSection}"`);
    console.log(`🔍 Assigned classes:`, assignedClasses.map(c => `${c.grade}-${c.section}`));
    console.log(`🔍 Students total:`, students.length);
    
    const isAssigned = assignedClasses.some(c => normalize(c.grade) === normalizedGrade && normalize(c.section) === normalizedSection);
    console.log(`🔍 Is class assigned?`, isAssigned);
    
    if (!isAssigned) {
      console.log(`❌ Class not assigned to teacher`);
      return [];
    }
    
    const filteredStudents = students.filter((s) => {
      // Normalize both student and class values for comparison
      const studentMatches = normalize(s.gradeLevel) === normalizedGrade && normalize(s.section) === normalizedSection;
      if (studentMatches) {
        console.log(`✅ Student match: ${s.fullName} (${s.gradeLevel}-${s.section})`);
      }
      return studentMatches;
    });
    
    console.log(`🔍 Found ${filteredStudents.length} students in ${grade}-${section}`);
    return filteredStudents;
  };

  // Filter grade levels to only show assigned classes
  const getAssignedGradeLevels = () => {
    const gradeColorMap = {
      "Kindergarten": "bg-purple-600",
      "Grade 1": "bg-blue-600",
      "Grade 2": "bg-green-600",
      "Grade 3": "bg-yellow-600",
    };

    const uniqueGrades = [...new Set(assignedClasses.map(c => c.grade))];
    return uniqueGrades.map(grade => ({
      name: grade,
      color: gradeColorMap[grade] || "bg-purple-600",
      sections: assignedClasses
        .filter(c => c.grade === grade)
        .map(c => c.section)
    }));
  };

  // ONLY ONE getColors FUNCTION — THIS IS THE FIX
  const getColors = (headerColor) => {
    const map = {
      "bg-purple-600": { bar: "from-purple-500 to-pink-500", text: "text-purple-700", pillBg: "bg-purple-100", pillText: "text-purple-800", pillHover: "hover:bg-purple-200", icon: "text-purple-600" },
      "bg-blue-600":   { bar: "from-blue-500 to-cyan-500",   text: "text-blue-700",   pillBg: "bg-blue-100",   pillText: "text-blue-800",   pillHover: "hover:bg-blue-200",   icon: "text-blue-600" },
      "bg-green-600":  { bar: "from-green-500 to-emerald-500", text: "text-green-700", pillBg: "bg-green-100", pillText: "text-green-800", pillHover: "hover:bg-green-200", icon: "text-green-600" },
      "bg-yellow-600": { bar: "from-yellow-400 to-orange-500", text: "text-yellow-700", pillBg: "bg-yellow-100", pillText: "text-yellow-800", pillHover: "hover:bg-yellow-200", icon: "text-yellow-600" },
    };
    return map[headerColor] || map["bg-purple-600"];
  };

  const gradeLevels = getAssignedGradeLevels();

  // Handlers
  const handleView = (student) => { setSelectedStudent(student); setShowViewModal(true); };
  const handleEdit = (student) => { setSelectedStudent(student); setEditFormData({ ...student }); setShowEditModal(true); };
  const handleDeleteRequest = (student) => { setSelectedStudent(student); setDeleteReason(""); setShowDeleteRequestModal(true); };

  const handleUpdateStudent = async () => {
    try {
      const fullName = `${editFormData.firstName || ""} ${editFormData.middleName || ""} ${editFormData.lastName || ""}`.trim();
      const qrNeedsUpdate = editFormData.lrn !== selectedStudent.lrn || fullName !== selectedStudent.fullName || editFormData.gradeLevel !== selectedStudent.gradeLevel || editFormData.section !== selectedStudent.section;

      let newQrCode = editFormData.qrCode;
      if (qrNeedsUpdate) {
        newQrCode = await QRCode.toDataURL(JSON.stringify({
          lrn: editFormData.lrn,
          name: fullName,
          gradeLevel: editFormData.gradeLevel,
          section: editFormData.section,
          email: editFormData.wmsuEmail,
        }), { width: 300, margin: 2 });
      }

      const updatedData = { ...editFormData, fullName, qrCode: newQrCode };
      const res = await fetch(`${API_BASE_URL}/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        alert("Student updated successfully!");
        fetchData();
        setShowEditModal(false);
      }
    } catch (err) {
      alert("Failed to update");
    }
  };

  const submitDeleteRequest = async () => {
    if (!deleteReason.trim()) return alert("Reason required");
    try {
      await fetch("http://localhost:3001/api/delete-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: selectedStudent.fullName,
          studentLRN: selectedStudent.lrn,
          requestedBy: "Teacher",
          reason: deleteReason,
        }),
      });
      alert("Delete request sent!");
      setShowDeleteRequestModal(false);
    } catch (err) {
      alert("Failed");
    }
  };

  return (
    <>
      {!loading && !localStorage.getItem("user") ? (
        // ── NOT LOGGED IN MESSAGE ──
        <div className="space-y-6 p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
            <InformationCircleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Please Log In</h3>
            <p className="text-red-800 mb-4">
              You need to log in to view your assigned classes. If you just cleared your cache, please log in again.
            </p>
            <a href="/" className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg">
              Go to Login
            </a>
          </div>
        </div>
      ) : viewingClass ? (
        // ── CLASS TABLE VIEW ──

        <div className="space-y-6 p-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 flex items-center gap-4">
            <button onClick={() => setViewingClass(null)} className="text-gray-600 hover:text-gray-900">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-gray-900">
              {viewingClass.grade} - {viewingClass.section}
            </h2>
          </div>

          {/* Student Selection Dropdown */}
          <div className="mb-4 flex items-center gap-4">
            <label htmlFor="studentSelect" className="font-semibold text-gray-700">Select Student:</label>
            <select
              id="studentSelect"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
              value={selectedStudent && selectedStudent.section === viewingClass.section ? selectedStudent.id : ''}
              onChange={e => {
                const classStudents = getStudentsInSection(viewingClass.grade, viewingClass.section);
                const found = classStudents.find(s => s.id === e.target.value);
                setSelectedStudent(found || null);
              }}
            >
              <option value="">All Students</option>
              {getStudentsInSection(viewingClass.grade, viewingClass.section).map(student => (
                <option key={student.id} value={student.id}>{student.fullName} ({student.lrn})</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max table-auto">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">No.</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider">Student Name</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider w-28">LRN</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider w-37">Grade & Section</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider w-16">Age</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider w-16">Sex</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider">WMSU Email</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider w-20">Status</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 tracking-wider w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    let classStudents = getStudentsInSection(viewingClass.grade, viewingClass.section);
                    if (selectedStudent && selectedStudent.section === viewingClass.section) {
                      classStudents = classStudents.filter(s => s.id === selectedStudent.id);
                    }
                    if (classStudents.length === 0) {
                      return <tr><td colSpan="9" className="text-center py-12 text-gray-500">No students in this class yet</td></tr>;
                    }
                    return classStudents.map((student, index) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2 text-sm font-semibold text-center">{index + 1}</td>
                        <td className="px-3 py-2 text-sm font-medium">{student.fullName}</td>
                        <td className="px-3 py-2 text-sm font-mono">{student.lrn}</td>
                        <td className="px-3 py-2 text-sm">{student.gradeLevel} - {student.section}</td>
                        <td className="px-3 py-2 text-sm text-center">{student.age}</td>
                        <td className="px-3 py-2 text-sm text-center">{student.sex}</td>
                        <td className="px-3 py-2 text-sm text-blue-600 font-mono truncate max-w-xs">{student.wmsuEmail}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${student.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center gap-3">
                            <button onClick={() => handleView(student)} className="text-blue-600 hover:text-blue-800"><EyeIcon className="w-5 h-5" /></button>
                            <button onClick={() => handleEdit(student)} className="text-green-600 hover:text-green-800"><PencilSquareIcon className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteRequest(student)} className="text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // ── MAIN GRADE LEVEL CARDS VIEW ──
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpenIcon className="w-10 h-10 text-red-800" />
              Grade Level Management
            </h2>
          </div>

          {gradeLevels.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
              <InformationCircleIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">No Classes Assigned</h3>
              <p className="text-blue-800">
                You haven't been assigned to any classes yet. Please contact the administrator to assign you to classes.
              </p>
            </div>
          ) : (
          <div className="max-w-max-w-6xl mx-auto px-4">
            <div className="space-y-10">
              {gradeLevels.map((level) => {
                const colors = getColors(level.color);
                const gradeStudents = getStudentsByGrade(level.name);

                return (
                  <div key={level.name} className="rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-200">
                    <div className={`${level.color} px-8 py-7 flex items-center justify-between`}>
                      <div className="flex items-center gap-7">
                        <div className="relative w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center shadow-inner">
                          <div className="absolute inset-0 rounded-full border-4 border-white/30"></div>
                          <BookOpenIcon className="w-12 h-12 text-white" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white leading-tight">{level.name}</h3>
                          <p className="text-white/80 text-base">
                            {level.sections.length} Section{level.sections.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-8 pt-8 pb-10">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-widest">Total of Students</p>
                          <p className="text-6xl font-bold text-gray-900 mt-1">{gradeStudents.length}</p>
                        </div>
                        <UsersIcon className={`w-14 h-14 ${colors.icon} opacity-90`} />
                      </div>

                      <div className="space-y-5">
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Sections</p>
                        {level.sections.map((section) => {
                          const sectionStudents = getStudentsInSection(level.name, section);
                          const classData = assignedClasses.find(c => c.grade === level.name && c.section === section);
                          const subjectTeachers = classData?.subject_teachers || [];
                          
                          return (
                            <div key={section} className="space-y-3">
                              <div className={`px-6 py-4 ${colors.pillBg} rounded-full ${colors.pillText} font-semibold text-lg flex items-center justify-between transition ${colors.pillHover}`}>
                                <span>{section} ({sectionStudents.length} student{sectionStudents.length !== 1 ? "s" : ""})</span>
                                <button
                                  onClick={() => setViewingClass({ grade: level.name, section })}
                                  className="px-8 py-2.5 bg-white text-red-700 rounded-lg font-bold hover:bg-gray-100 transition shadow"
                                >
                                  View Class
                                </button>
                              </div>
                              
                              {/* Subject Teachers Display */}
                              {subjectTeachers.length > 0 && (
                                <div className="px-6 py-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold mb-2">Subject Teachers</p>
                                  <div className="space-y-2">
                                    {subjectTeachers.map((st, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-blue-100">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">{st.teacher_name}</p>
                                          <p className="text-xs text-gray-600">{st.subject}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-10">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Attendance Rate</span>
                          <span className={`font-bold ${colors.text}`}>95.65%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-7">
                          <div className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-1000`} style={{ width: "95.65%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showViewModal && selectedStudent && (
        <ViewStudentModal student={selectedStudent} onClose={() => setShowViewModal(false)} />
      )}
      {showEditModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          formData={editFormData}
          setFormData={setEditFormData}
          onSave={handleUpdateStudent}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showDeleteRequestModal && selectedStudent && (
        <DeleteRequestModal
          student={selectedStudent}
          reason={deleteReason}
          setReason={setDeleteReason}
          onSubmit={submitDeleteRequest}
          onClose={() => setShowDeleteRequestModal(false)}
        />
      )}
    </>
  );
}
