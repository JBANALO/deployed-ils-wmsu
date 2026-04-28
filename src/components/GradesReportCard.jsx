import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export default function GradesReportCard({ students, quarter, gradeLevel, section, classId, schoolYearId, onClose }) {
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsWithGrades, setStudentsWithGrades] = useState([]);
  const [gradeSubjectsMap, setGradeSubjectsMap] = useState({});
  const [classAdviserMap, setClassAdviserMap] = useState({});
  const [activeSchoolYearMeta, setActiveSchoolYearMeta] = useState(null);
  const [subjectTeacherSubjectsByClass, setSubjectTeacherSubjectsByClass] = useState({});

  const quarterLabels = {
    q1: 'FIRST QUARTER',
    q2: 'SECOND QUARTER',
    q3: 'THIRD QUARTER',
    q4: 'FOURTH QUARTER'
  };

  const toGradeKey = (value) => String(value || '').replace(/^Grade\s+/i, '').trim();
  const toClassKey = (grade, sec) => `${String(grade || '').toLowerCase().replace(/\s+/g, '-')}-${String(sec || '').toLowerCase().replace(/\s+/g, '-')}`;
  const schoolYearParams = schoolYearId ? { schoolYearId } : {};
  const normalizeSubjectName = (value) => String(value || '').replace(/\s*\(Grade\s+\d+\)\s*$/i, '').replace(/\s*\(Kindergarten\)\s*$/i, '').trim().toLowerCase();
  const uniqueSubjects = (list) => {
    const seen = new Set();
    const result = [];
    (Array.isArray(list) ? list : []).forEach((name) => {
      const key = normalizeSubjectName(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(name);
    });
    return result;
  };
  const studentGrade = (student) => student?.gradeLevel || student?.grade_level || gradeLevel;
  const studentSection = (student) => student?.section || student?.Section || section;
  const currentUserName = (() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';
      const u = JSON.parse(raw);
      return `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim();
    } catch (_) {
      return '';
    }
  })();
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  })();
  const currentUserId = String(currentUser?.id || '').trim();
  const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const currentUserRole = normalizeRole(currentUser?.role);

  useEffect(() => {
    const fetchSubjectTeacherSubjects = async () => {
      if (!currentUser?.id) {
        setSubjectTeacherSubjectsByClass({});
        return;
      }

      if (!(currentUserRole === 'teacher' || currentUserRole === 'subject_teacher')) {
        setSubjectTeacherSubjectsByClass({});
        return;
      }

      try {
        const response = await api.get(`/classes/subject-teacher/${currentUser.id}`, { params: schoolYearParams });
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const map = {};
        rows.forEach((cls) => {
          const key = toClassKey(cls.grade || cls.grade_level, cls.section);
          const rawSubjects = Array.isArray(cls.subjects)
            ? cls.subjects
            : String(cls.subjects_teaching || cls.subjects || '').split(',');
          map[key] = uniqueSubjects(rawSubjects.map((item) => String(item || '').trim()).filter(Boolean));
        });
        setSubjectTeacherSubjectsByClass(map);
      } catch (error) {
        console.error('Error fetching subject teacher assignments for report card:', error);
        setSubjectTeacherSubjectsByClass({});
      }
    };

    fetchSubjectTeacherSubjects();
  }, [currentUser?.id, currentUserRole, schoolYearId]);

  // Fetch grades for all students when component mounts
  useEffect(() => {
    const fetchGradesForStudents = async () => {
      setLoading(true);
      try {
        const updatedStudents = await Promise.all(
          students.map(async (student) => {
            try {
              const gradesResponse = await api.get(`/students/${student.id}/grades`, { params: schoolYearParams });
              // Normalize keys: strip " (Grade X)" suffix so "Math (Grade 3)" → "Math"
              const raw = gradesResponse.data || {};
              const normalized = {};
              for (const [k, v] of Object.entries(raw)) {
                const cleanKey = k.replace(/\s*\(Grade\s+\d+\)/i, '').trim();
                normalized[cleanKey] = v;
              }
              return { ...student, grades: normalized };
            } catch (error) {
              console.error(`Error fetching grades for student ${student.id}:`, error);
              return { ...student, grades: {} };
            }
          })
        );
        setStudentsWithGrades(updatedStudents);
        console.log('Fetched grades for students:', updatedStudents);
      } catch (error) {
        console.error('Error fetching grades:', error);
        setStudentsWithGrades(students);
      } finally {
        setLoading(false);
      }
    };

    if (students && students.length > 0) {
      fetchGradesForStudents();
    }
  }, [students, schoolYearId]);

  // Fetch class subjects when component mounts
  useEffect(() => {
    const fetchClassSubjects = async () => {
      try {
        // Source of truth: fetch subjects for this grade level from admin Subjects table
        if (gradeLevel && gradeLevel !== 'All Grades') {
          // grade_levels in DB stores just the number (e.g. '3' not 'Grade 3')
          const gradeKey = (gradeLevel || '').replace(/^Grade\s+/i, '').trim();
          const resp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`, { params: schoolYearParams });
          const names = uniqueSubjects((resp.data?.data || []).map(s => s.name).filter(Boolean));

          if (names.length > 0) {
            setClassSubjects(names);
            return;
          }
        }

        if (classId) {
          // Fallback: fetch subjects assigned to this specific class
          const response = await api.get(`/classes/${classId}/subjects`, { params: schoolYearParams });
          const classSpecificSubjects = response.data.subjects || [];
          if (classSpecificSubjects.length > 0) {
            setClassSubjects(classSpecificSubjects);
            return;
          }
        }

        // Last fallback: keep empty so UI relies on DB-configured subjects and actual encoded grades
        if (gradeLevel && gradeLevel !== 'All Grades') {
          setClassSubjects([]);
        } else {
          setClassSubjects([]);
        }
      } catch (error) {
        console.error('Error fetching class subjects:', error);
        setClassSubjects([]);
      }
    };

    fetchClassSubjects();
  }, [classId, gradeLevel, schoolYearId]);

  // Fetch subjects per actual student grade and class adviser names
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const normalizedGradeKeys = [...new Set((students || []).map(s => toGradeKey(studentGrade(s))).filter(Boolean))];
        const gradeMap = {};

        await Promise.all(normalizedGradeKeys.map(async (g) => {
          try {
            const resp = await api.get(`/subjects/grade/${encodeURIComponent(g)}`, { params: schoolYearParams });
            const names = (resp.data?.data || []).map(item => item.name).filter(Boolean);
            gradeMap[g] = names;
          } catch (_) {
            gradeMap[g] = [];
          }
        }));

        setGradeSubjectsMap(gradeMap);

        const classesResp = await api.get('/classes', { params: schoolYearParams });
        const classes = Array.isArray(classesResp.data)
          ? classesResp.data
          : (Array.isArray(classesResp.data?.data) ? classesResp.data.data : []);
        const adviserMap = {};
        classes.forEach((cls) => {
          adviserMap[toClassKey(cls.grade, cls.section)] = {
            adviser_name: cls.adviser_name || '',
            adviser_id: cls.adviser_id ? String(cls.adviser_id) : ''
          };
        });
        setClassAdviserMap(adviserMap);
      } catch (error) {
        console.error('Error fetching report card metadata:', error);
      }
    };

    if (students && students.length > 0) {
      fetchMetadata();
    }
  }, [students, gradeLevel, schoolYearId]);

  const subjects = classSubjects;
  const today = new Date().toLocaleDateString();
  const reportCardSchoolYear = activeSchoolYearMeta?.label || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const reportCardPrincipalName = activeSchoolYearMeta?.principal_name || '________________';
  const reportCardAssistantPrincipalName = activeSchoolYearMeta?.assistant_principal_name || '________________';

  useEffect(() => {
    const fetchSchoolYearMeta = async () => {
      try {
        if (schoolYearId) {
          const response = await api.get('/school-years');
          const list = response.data?.data || response.data || [];
          const selected = Array.isArray(list)
            ? list.find((item) => String(item.id) === String(schoolYearId))
            : null;
          if (selected) {
            setActiveSchoolYearMeta(selected);
            return;
          }
        }

        const activeResponse = await api.get('/school-years/active');
        setActiveSchoolYearMeta(activeResponse.data?.data || null);
      } catch (error) {
        console.error('Error fetching active school year metadata:', error);
      }
    };

    fetchSchoolYearMeta();
  }, [schoolYearId]);

  const handlePrint = () => {
    window.print();
  };

  const getQuarterNumber = () => {
    const map = { q1: '1st', q2: '2nd', q3: '3rd', q4: '4th' };
    return map[quarter] || '1st';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" id="report-card-modal">
        {/* Header with buttons */}
        <div className="sticky top-0 bg-gray-50 border-b p-4 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold">
            {students.length === 1
              ? `Report Card — ${students[0].fullName || students[0].firstName}`
              : `DepED Report Cards (${students.length} students)`}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🖨️ {students.length === 1 ? 'Print' : 'Print All'}
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
          {loading ? (
            <div className="text-center py-8">Loading grades...</div>
          ) : studentsWithGrades.map((student, studentIndex) => {
            const gradeObj = student.grades || {};
            // Use student's actual grade level
            const studentGradeLevel = studentGrade(student);
            const studentGradeKey = toGradeKey(studentGradeLevel);
            const studentClassKey = toClassKey(studentGradeLevel, studentSection(student));
            const adviserInfo = classAdviserMap[studentClassKey] || {};
            const classAdviserName = adviserInfo.adviser_name || student.adviser_name || '_______________';
            const classAdviserId = String(adviserInfo.adviser_id || student.adviser_id || '').trim();
            const isCurrentUserClassAdviser = Boolean(
              (currentUserId && classAdviserId && currentUserId === classAdviserId) ||
              (classAdviserName && currentUserName && normalizeSubjectName(classAdviserName) === normalizeSubjectName(currentUserName))
            );
            // Prefer subjects that actually have grade data; fall back to class/grade subject list
            const gradeKeys = Object.keys(gradeObj).filter(k => {
              const g = gradeObj[k];
              return g && (g.q1 || g.q2 || g.q3 || g.q4);
            });
            const gradeConfiguredSubjects = uniqueSubjects(gradeSubjectsMap[studentGradeKey] || []);
            const subjectTeacherAssigned = uniqueSubjects(subjectTeacherSubjectsByClass[studentClassKey] || []);

            // Subject-teacher view: only show assigned subjects (and existing graded entries for those subjects).
            // Adviser/admin/student view: show full grade subjects + graded entries.
            const isPrivilegedFullView = ['admin', 'adviser', 'student'].includes(currentUserRole);
            const isSubjectTeacherRestrictedView =
              (currentUserRole === 'teacher' || currentUserRole === 'subject_teacher') && !isPrivilegedFullView && !isCurrentUserClassAdviser;

            const studentSubjects = isSubjectTeacherRestrictedView
              ? uniqueSubjects([
                  ...subjectTeacherAssigned,
                  ...gradeKeys.filter((key) =>
                    subjectTeacherAssigned.some((item) => normalizeSubjectName(item) === normalizeSubjectName(key))
                  )
                ])
              : uniqueSubjects([
                  ...gradeConfiguredSubjects,
                  ...gradeKeys
                ]);
            // Helper: find grade data for a subject name (handles minor name differences)
            const findGrade = (subjectName) => {
              if (gradeObj[subjectName]) return gradeObj[subjectName];
              const normalizedSubject = normalizeSubjectName(subjectName);
              const matchedKey = Object.keys(gradeObj).find(k =>
                normalizeSubjectName(k) === normalizedSubject
              );
              return matchedKey ? gradeObj[matchedKey] : null;
            };

            const quarterKeys = ['q1', 'q2', 'q3', 'q4'];
            const isValidGradeValue = (value) => Number.isFinite(value) && value > 0;
            const quarterAverages = quarterKeys.reduce((acc, quarterKey) => {
              const quarterValues = studentSubjects
                .map((subject) => Number(findGrade(subject)?.[quarterKey]))
                .filter((value) => isValidGradeValue(value));

              acc[quarterKey] = quarterValues.length > 0
                ? Math.round(quarterValues.reduce((sum, value) => sum + value, 0) / quarterValues.length)
                : '';
              return acc;
            }, {});

            const subjectFinalRatings = studentSubjects.reduce((acc, subject) => {
              const gradeData = findGrade(subject);
              const qValues = ['q1', 'q2', 'q3', 'q4'].map((key) => Number(gradeData?.[key]));
              const hasCompleteQuarters = qValues.every((value) => isValidGradeValue(value));

              acc[subject] = hasCompleteQuarters
                ? Math.round(qValues.reduce((sum, value) => sum + value, 0) / qValues.length)
                : '';
              return acc;
            }, {});

            const computedFinalAverage = (() => {
              const finalRatings = studentSubjects
                .map((subject) => subjectFinalRatings[subject])
                .filter((value) => isValidGradeValue(value));

              const hasCompleteFinalRatings =
                studentSubjects.length > 0 && finalRatings.length === studentSubjects.length;

              if (hasCompleteFinalRatings) {
                return Math.round(
                  finalRatings.reduce((sum, value) => sum + value, 0) / finalRatings.length
                );
              }

              return '';
            })();
            
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

                <div className="text-center mb-4">
                  <h2 className="text-sm font-bold">REPORT CARD</h2>
                  <p className="text-xs mt-1">School Year: {reportCardSchoolYear}</p>
                </div>

                {/* Student Information */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <p><span className="font-bold">Name:</span> {student.fullName || `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim()}</p>
                    <p><span className="font-bold">LRN:</span> {student.lrn || 'N/A'}</p>
                  </div>
                  <div>
                    <p><span className="font-bold">School:</span> WMSU ILS - Elementary Department</p>
                    <p><span className="font-bold">School ID:</span> _______________</p>
                  </div>
                  <div>
                    <p><span className="font-bold">Grade:</span> {studentGradeLevel}</p>
                    <p><span className="font-bold">School Year:</span> {reportCardSchoolYear}</p>
                  </div>
                  <div>
                    <p><span className="font-bold">Section:</span> {studentSection(student)}</p>
                    <p><span className="font-bold">Class Adviser:</span> {classAdviserName}</p>
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
                        const gradeData = findGrade(subject);
                        const q1Val = gradeData?.q1 || '';
                        const q2Val = gradeData?.q2 || '';
                        const q3Val = gradeData?.q3 || '';
                        const q4Val = gradeData?.q4 || '';
                        
                        const finalRating = subjectFinalRatings[subject] || '';

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
                        <td className="border-2 border-gray-900 p-2 text-center font-bold">{quarterAverages.q1}</td>
                        <td className="border-2 border-gray-900 p-2 text-center font-bold">{quarterAverages.q2}</td>
                        <td className="border-2 border-gray-900 p-2 text-center font-bold">{quarterAverages.q3}</td>
                        <td className="border-2 border-gray-900 p-2 text-center font-bold">{quarterAverages.q4}</td>
                        <td className="border-2 border-gray-900 p-2 text-center font-bold">
                          {computedFinalAverage}
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
                    <p className="text-center text-xs font-semibold py-1">{classAdviserName}</p>
                    <p className="text-center text-xs text-gray-600 py-1">Class Adviser</p>
                  </div>
                  <div>
                    <p className="border-t border-gray-800 text-center pt-2">Verified by:</p>
                    <p className="text-center text-xs font-semibold py-1">{reportCardPrincipalName}</p>
                    <p className="text-center text-xs text-gray-600 py-1">Principal</p>
                    <p className="text-center text-xs font-semibold py-1">{reportCardAssistantPrincipalName}</p>
                    <p className="text-center text-xs text-gray-600 py-1">Assistant Principal</p>
                  </div>
                  <div>
                    <p className="border-t border-gray-800 text-center pt-2">Date:</p>
                    <p className="text-center text-xs text-gray-600 py-1">{today}</p>
                  </div>
                </div>

                {/* Page Break for Print */}
                {studentIndex < studentsWithGrades.length - 1 && (
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
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          body * {
            visibility: hidden !important;
          }

          #report-card,
          #report-card * {
            visibility: visible !important;
          }

          #report-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          #report-card-modal {
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

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
