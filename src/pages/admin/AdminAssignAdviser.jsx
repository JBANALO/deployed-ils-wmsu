import React, { useState, useEffect } from "react";
import { UserGroupIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from "@heroicons/react/24/solid";
import { API_BASE_URL } from "../../api/config";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";

export default function AdminAssignAdviser() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedAdviser, setSelectedAdviser] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [activeTab, setActiveTab] = useState("adviser"); // "adviser" | "subject"
  // Subject teacher assignment state
  const [selectedClassForSubject, setSelectedClassForSubject] = useState(null);
  const [selectedSubjectTeacher, setSelectedSubjectTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [classSubjects, setClassSubjects] = useState([]); // subjects for selected class (from admin DB)
  // Adviser-tab subject checklist
  const [adviserSubjects, setAdviserSubjects] = useState([]); // available subjects for selected class grade
  const [selectedAdviserSubjects, setSelectedAdviserSubjects] = useState([]); // checked subjects

  useEffect(() => {
    const fetchActiveSchoolYear = async () => {
      try {
        const response = await api.get('/school-years');
        const list = response.data?.data || response.data || [];
        const active = Array.isArray(list) ? list.find((item) => item.is_active) : null;
        if (active?.id) {
          setActiveSchoolYearId(String(active.id));
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to load active school year:', error.message);
        setLoading(false);
      }
    };

    fetchActiveSchoolYear();
  }, []);

  useEffect(() => {
    if (!activeSchoolYearId) return;
    fetchData(activeSchoolYearId);
  }, [activeSchoolYearId]);

  const normalizeId = (value) => String(value ?? "");
  const findTeacherById = (teacherId) => teachers.find((teacher) => normalizeId(teacher.id) === normalizeId(teacherId));

  // Fetch subjects when class is selected in Assign Adviser tab
  useEffect(() => {
    if (!selectedClass) { setAdviserSubjects([]); setSelectedAdviserSubjects([]); return; }
    const fetchAdviserSubjects = async () => {
      try {
        const gradeKey = (selectedClass.grade || '').replace(/^Grade\s+/i, '').trim();
        const resp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`);
        const names = (resp.data?.data || []).map(s => s.name).filter(Boolean);
        setAdviserSubjects(names);
        setSelectedAdviserSubjects([]); // reset schedule when class changes
      } catch (e) {
        setAdviserSubjects([]);
      }
    };
    fetchAdviserSubjects();
  }, [selectedClass]);

  const fetchData = async (schoolYearId = activeSchoolYearId) => {
    try {
      if (!schoolYearId) {
        setClasses([]);
        setTeachers([]);
        setLoading(false);
        return;
      }

      const schoolYearQuery = `schoolYearId=${encodeURIComponent(String(schoolYearId))}`;

      // Fetch classes with adviser info
      const classesResponse = await fetch(`${API_BASE_URL}/classes?${schoolYearQuery}`);
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        console.log('Raw classes response:', classesData);
        
        // Handle different response formats
        let classesArray = [];
        if (Array.isArray(classesData)) {
          classesArray = classesData;
        } else if (Array.isArray(classesData.data)) {
          classesArray = classesData.data;
        } else if (Array.isArray(classesData.classes)) {
          classesArray = classesData.classes;
        }
        
        // Log class details
        console.log('Classes array:', classesArray.map(c => ({
          id: c.id,
          grade: c.grade,
          section: c.section,
          adviser_name: c.adviser_name
        })));
        
        toast.success('Classes loaded successfully');
        setClasses(classesArray);
      } else {
        toast.error(`Failed to load classes: ${classesResponse.status}`);
      }

      // Fetch teachers/advisers - try /teachers first, fall back to /users if it fails
      let allTeachers = [];
      try {
        const teachersResponse = await fetch(`${API_BASE_URL}/teachers?${schoolYearQuery}`);
        if (teachersResponse.ok) {
          const data = await teachersResponse.json();
          allTeachers = data.data?.teachers || data.teachers || [];
          console.log('Teachers fetched from /teachers:', allTeachers);
        }
      } catch (err) {
        console.log('Could not fetch from /teachers:', err.message);
      }

      // If /teachers didn't work, fall back to /users
      if (allTeachers.length === 0) {
        try {
          const usersResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/api/users`);
          if (usersResponse.ok) {
            const data = await usersResponse.json();
            allTeachers = (data.data || data.users || [])
              .filter(u => u.role === 'adviser' || u.role === 'teacher')
              .map(u => ({
                id: u.id,
                firstName: u.firstName || u.first_name || '',
                lastName: u.lastName || u.last_name || '',
                email: u.email,
                role: u.role,
                gradeLevel: u.gradeLevel || u.grade_level,
                section: u.section
              }));
            console.log('Teachers fetched from /users:', allTeachers);
          }
        } catch (err) {
          console.log('Could not fetch from /users:', err.message);
        }
      }
      
      console.log('Teachers list after filter:', allTeachers);
      console.log('Teachers list length:', allTeachers.length);
      
      if (allTeachers.length === 0) {
        toast.warning('No teachers/advisers found in the system');
      } else {
        toast.success(`Found ${allTeachers.length} teachers/advisers`);
      }
      setTeachers(allTeachers);
    } catch (error) {
      toast.error('Error loading data: ' + error.message);
      setMessage("Error loading data: " + error.message);
      setMessageType("error");
    }
    setLoading(false);
  };

  const handleAssignAdviser = async () => {
    if (!selectedClass || !selectedAdviser) {
      setMessage("Please select both a class and an adviser");
      setMessageType("error");
      return;
    }

    try {
      const adviser = findTeacherById(selectedAdviser);
      
      // Safety check: make sure adviser was found
      if (!adviser) {
        throw new Error(`Adviser with ID ${selectedAdviser} not found. Available teachers: ${teachers.map(t => t.id).join(', ')}`);
      }
      
      if (!adviser.firstName || !adviser.lastName) {
        throw new Error(`Adviser data incomplete - firstName: ${adviser.firstName}, lastName: ${adviser.lastName}`);
      }
      
      const adviserName = `${adviser.firstName} ${adviser.lastName}`;
      
      // Generate class ID if not present (format: grade-section like "grade-3-diligence")
      const classId = selectedClass.id || `${selectedClass.grade.toLowerCase().replace(/\s+/g, '-')}-${selectedClass.section.toLowerCase()}`;
      
      console.log('Assigning adviser:', { classId, adviserName, adviser_id: adviser.id });
      toast.info(`Assigning ${adviserName} to ${selectedClass.grade} - ${selectedClass.section}`);
      
      const response = await fetch(
        `${API_BASE_URL}/classes/${classId}/assign?schoolYearId=${encodeURIComponent(activeSchoolYearId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adviser_id: adviser.id,
            adviser_name: adviserName,
            grade: selectedClass.grade,
            section: selectedClass.section,
            schoolYearId: activeSchoolYearId
          })
        }
      );

      const responseData = await response.json();
      console.log('Assignment response:', responseData);
      toast.info('Assignment response received');

      if (response.ok) {
        const subjectAssignmentErrors = [];

        // Also assign selected subjects to subject_teachers with the adviser as teacher
        for (const item of selectedAdviserSubjects) {
          try {
            await api.put(`/classes/${classId}/assign-subject-teacher`, {
              teacher_id: adviser.id,
              teacher_name: adviserName,
              subject: item.subject,
              day: item.day,
              start_time: item.startTime,
              end_time: item.endTime,
              schoolYearId: activeSchoolYearId
            });
          } catch (subjectErr) {
            const subjectMessage = subjectErr.response?.data?.message || subjectErr.response?.data?.error || subjectErr.message;
            console.warn(`Could not assign subject ${item.subject}:`, subjectMessage);
            subjectAssignmentErrors.push(`${item.subject}: ${subjectMessage}`);
          }
        }

        if (subjectAssignmentErrors.length > 0) {
          setMessage(`Adviser assigned, but some subject schedules were rejected: ${subjectAssignmentErrors.join(' | ')}`);
          setMessageType("error");
        } else {
          setMessage(`Successfully assigned ${adviserName} to ${selectedClass.grade} - ${selectedClass.section}${selectedAdviserSubjects.length > 0 ? ` with ${selectedAdviserSubjects.length} subject(s)` : ''}`);
          setMessageType("success");
        }
        setSelectedClass(null);
        setSelectedAdviser("");
        setSelectedAdviserSubjects([]);
        setAdviserSubjects([]);
        
        // Refetch data to get updated adviser assignments from database
        await fetchData();
      } else {
        setMessage(`Error assigning adviser: ${responseData.message || response.statusText}`);
        setMessageType("error");
      }
    } catch (error) {
      toast.error('Error assigning adviser: ' + error.message);
      setMessage("Error assigning adviser: " + error.message);
      setMessageType("error");
    }
  };

  const handleUnassignAdviser = async (classItem) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/classes/${classItem.id}/unassign?schoolYearId=${encodeURIComponent(activeSchoolYearId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adviser_id: classItem.adviser_id })
        }
      );

      if (response.ok) {
        setMessage(`Adviser removed from ${classItem.grade} - ${classItem.section}`);
        setMessageType("success");
        await fetchData();
      } else {
        setMessage("Error removing adviser");
        setMessageType("error");
      }
    } catch (error) {
      toast.error('Error removing adviser: ' + error.message);
      setMessage("Error removing adviser");
      setMessageType("error");
    }
  };

  // Fetch subjects for selected class from admin Subjects DB
  useEffect(() => {
    if (!selectedClassForSubject) { setClassSubjects([]); return; }
    const fetchSubjects = async () => {
      try {
        const gradeKey = (selectedClassForSubject.grade || '').replace(/^Grade\s+/i, '').trim();
        const resp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`);
        const names = (resp.data?.data || []).map(s => s.name).filter(Boolean);
        setClassSubjects(names);
      } catch (e) {
        setClassSubjects([]);
      }
    };
    fetchSubjects();
  }, [selectedClassForSubject]);

  const handleAssignSubjectTeacher = async () => {
    if (!selectedClassForSubject || !selectedSubjectTeacher || !selectedSubject) {
      setMessage("Please select class, teacher, and subject");
      setMessageType("error");
      return;
    }
    try {
      const teacher = findTeacherById(selectedSubjectTeacher);
      if (!teacher) {
        throw new Error(`Teacher with ID ${selectedSubjectTeacher} not found. Available teachers: ${teachers.map(t => t.id).join(', ')}`);
      }
      if (startTime >= endTime) {
        throw new Error('End time must be later than start time');
      }
      await api.put(`/classes/${selectedClassForSubject.id}/assign-subject-teacher`, {
        teacher_id: teacher.id,
        teacher_name: `${teacher.firstName} ${teacher.lastName}`,
        subject: selectedSubject,
        day: selectedDay,
        start_time: startTime,
        end_time: endTime,
        schoolYearId: activeSchoolYearId
      });
      setMessage(`✅ ${teacher.firstName} ${teacher.lastName} assigned to teach ${selectedSubject} in ${selectedClassForSubject.grade} - ${selectedClassForSubject.section}`);
      setMessageType("success");
      setSelectedSubjectTeacher("");
      setSelectedSubject("");
      await fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message;
      setMessage("Error: " + msg);
      setMessageType("error");
    }
  };

  const handleRemoveSubjectTeacher = async (classId, teacherId) => {
    try {
      await api.put(`/classes/${classId}/unassign-subject-teacher/${teacherId}?schoolYearId=${encodeURIComponent(activeSchoolYearId)}`);
      setMessage("Subject teacher removed successfully");
      setMessageType("success");
      await fetchData();
    } catch (error) {
      setMessage("Error removing subject teacher: " + error.message);
      setMessageType("error");
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-red-600" />
          Assign Adviser / Subject Teacher
        </h1>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${messageType === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          <button
            onClick={() => setActiveTab("adviser")}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition ${
              activeTab === "adviser" ? "bg-red-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            👤 Assign Adviser
          </button>
          <button
            onClick={() => setActiveTab("subject")}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition ${
              activeTab === "subject" ? "bg-red-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📚 Assign Subject Teacher
          </button>
        </div>

        {/* Assignment Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {activeTab === "adviser" ? (
            <>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Assign Adviser to Class</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                  <select
                    value={selectedClass ? (selectedClass.id || `${selectedClass.grade.toLowerCase().replace(/\s+/g, '-')}-${selectedClass.section.toLowerCase()}`) : ""}
                    onChange={(e) => {
                      const selected = classes.find(c => (c.id || `${c.grade.toLowerCase().replace(/\s+/g, '-')}-${c.section.toLowerCase()}`) === e.target.value);
                      setSelectedClass(selected);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose a class --</option>
                    {classes.map(classItem => {
                      const classId = classItem.id || `${classItem.grade.toLowerCase().replace(/\s+/g, '-')}-${classItem.section.toLowerCase()}`;
                      return (
                        <option key={classId} value={classId}>
                          {classItem.grade} - {classItem.section}
                          {classItem.adviser_name && ` (Currently: ${classItem.adviser_name})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Adviser</label>
                  <select
                    value={selectedAdviser}
                    onChange={(e) => setSelectedAdviser(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose an adviser --</option>
                    {teachers.map(teacher => (
                      <option key={normalizeId(teacher.id)} value={normalizeId(teacher.id)}>
                        {teacher.firstName} {teacher.lastName} ({teacher.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Subjects checklist — shows after class is chosen */}
              {adviserSubjects.length > 0 && (() => {
                // Detect schedule conflicts: same day AND overlapping times between selected subjects
                const toMinutes = t => { const [h,m] = (t||'00:00').split(':').map(Number); return h*60+m; };
                const conflicts = new Set();
                // Within selected subjects
                for (let i = 0; i < selectedAdviserSubjects.length; i++) {
                  for (let j = i+1; j < selectedAdviserSubjects.length; j++) {
                    const a = selectedAdviserSubjects[i], b = selectedAdviserSubjects[j];
                    if (a.day === b.day) {
                      const aStart=toMinutes(a.startTime), aEnd=toMinutes(a.endTime);
                      const bStart=toMinutes(b.startTime), bEnd=toMinutes(b.endTime);
                      if (aStart < bEnd && bStart < aEnd) {
                        conflicts.add(a.subject);
                        conflicts.add(b.subject);
                      }
                    }
                  }
                }
                // Against existing subject_teachers for this class
                const existingSTs = selectedClass ? (classes.find(c => c.id === selectedClass.id)?.subject_teachers || []) : [];
                const existingConflicts = new Set();
                for (const entry of selectedAdviserSubjects) {
                  for (const st of existingSTs) {
                    if (st.day === entry.day) {
                      const eStart=toMinutes(entry.startTime), eEnd=toMinutes(entry.endTime);
                      const sStart=toMinutes(st.start_time), sEnd=toMinutes(st.end_time);
                      if (eStart < sEnd && sStart < eEnd) {
                        existingConflicts.add(`${entry.subject}|${st.teacher_name}|${st.subject}`);
                        conflicts.add(entry.subject);
                      }
                    }
                  }
                }
                return (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjects this Adviser will teach <span className="text-gray-400 font-normal">(optional — set day &amp; time per subject)</span>
                  </label>
                  {conflicts.size > 0 && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700">
                      ⚠️ <strong>Schedule conflict detected!</strong> Check highlighted subjects — they share the same day and overlapping time.
                      {[...existingConflicts].map((k,i) => {
                        const [sub,,existSub] = k.split('|');
                        return <div key={i} className="mt-0.5">• <em>{sub}</em> conflicts with existing <em>{existSub}</em></div>;
                      })}
                    </div>
                  )}
                  <div className="space-y-1.5 p-3 border border-gray-200 rounded-md bg-gray-50 max-h-72 overflow-y-auto">
                    {adviserSubjects.map(sub => {
                      const entry = selectedAdviserSubjects.find(x => x.subject === sub);
                      const checked = !!entry;
                      const hasConflict = conflicts.has(sub);
                      return (
                        <div key={sub} className={`rounded-md transition ${
                          hasConflict ? 'bg-red-50 border border-red-300 p-2.5' :
                          checked ? 'bg-white border border-blue-200 shadow-sm p-2.5' : 'p-1'
                        }`}>
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAdviserSubjects(prev => [...prev, { subject: sub, day: 'Monday', startTime: '08:00', endTime: '09:00' }]);
                                } else {
                                  setSelectedAdviserSubjects(prev => prev.filter(x => x.subject !== sub));
                                }
                              }}
                              className="accent-red-600 w-4 h-4 flex-shrink-0"
                            />
                            <span className={`font-medium ${hasConflict ? 'text-red-700' : ''}`}>{sub}</span>
                            {hasConflict && <span className="ml-1 text-xs text-red-600 font-semibold">⚠️ Conflict</span>}
                          </label>
                          {checked && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                              <select
                                value={entry.day}
                                onChange={(e) => setSelectedAdviserSubjects(prev =>
                                  prev.map(x => x.subject === sub ? { ...x, day: e.target.value } : x)
                                )}
                                className={`text-xs p-1.5 border rounded focus:ring-1 focus:ring-red-400 ${hasConflict ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                              >
                                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <input
                                type="time"
                                value={entry.startTime}
                                onChange={(e) => setSelectedAdviserSubjects(prev =>
                                  prev.map(x => x.subject === sub ? { ...x, startTime: e.target.value } : x)
                                )}
                                className={`text-xs p-1.5 border rounded focus:ring-1 focus:ring-red-400 ${hasConflict ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                              />
                              <span className="text-xs text-gray-400">to</span>
                              <input
                                type="time"
                                value={entry.endTime}
                                onChange={(e) => setSelectedAdviserSubjects(prev =>
                                  prev.map(x => x.subject === sub ? { ...x, endTime: e.target.value } : x)
                                )}
                                className={`text-xs p-1.5 border rounded focus:ring-1 focus:ring-red-400 ${hasConflict ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedAdviserSubjects.length > 0 && (
                    <p className="text-xs text-green-700 mt-1">{selectedAdviserSubjects.length} subject(s) selected</p>
                  )}
                </div>
                );
              })()}
              {selectedClass && adviserSubjects.length === 0 && (
                <div className="md:col-span-2 text-xs text-amber-600 italic">
                  No subjects configured for this grade. Add them in Subjects first.
                </div>
              )}
              <button
                onClick={() => {
                  // Block save if there are conflicts
                  const toMinutes = t => { const [h,m]=(t||'00:00').split(':').map(Number); return h*60+m; };
                  for (let i=0;i<selectedAdviserSubjects.length;i++) {
                    for (let j=i+1;j<selectedAdviserSubjects.length;j++) {
                      const a=selectedAdviserSubjects[i], b=selectedAdviserSubjects[j];
                      if (a.day===b.day && toMinutes(a.startTime)<toMinutes(b.endTime) && toMinutes(b.startTime)<toMinutes(a.endTime)) {
                        setMessage(`⚠️ Schedule conflict: "${a.subject}" and "${b.subject}" overlap on ${a.day}. Please fix before saving.`);
                        setMessageType('error');
                        return;
                      }
                    }
                  }
                  handleAssignAdviser();
                }}
                className="w-full bg-red-600 text-white font-semibold py-3 rounded-md hover:bg-red-700 transition md:col-span-2"
              >
                Assign Adviser{selectedAdviserSubjects.length > 0 ? ` + ${selectedAdviserSubjects.length} Subject(s)` : ''}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Assign Subject Teacher to Class</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Class */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                  <select
                    value={selectedClassForSubject ? selectedClassForSubject.id : ""}
                    onChange={(e) => {
                      const cls = classes.find(c => String(c.id) === e.target.value);
                      setSelectedClassForSubject(cls || null);
                      setSelectedSubject("");
                    }}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose a class --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.grade} - {cls.section}</option>
                    ))}
                  </select>
                </div>
                {/* Teacher */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject Teacher</label>
                  <select
                    value={selectedSubjectTeacher}
                    onChange={(e) => setSelectedSubjectTeacher(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose a teacher --</option>
                    {teachers.map(teacher => (
                      <option key={normalizeId(teacher.id)} value={normalizeId(teacher.id)}>
                        {teacher.firstName} {teacher.lastName} ({teacher.role})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose a subject --</option>
                    {classSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {classSubjects.length === 0 && selectedClassForSubject && (
                      <option disabled>No subjects configured for this grade. Add them in Subjects.</option>
                    )}
                  </select>
                </div>
                {/* Day */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* Time */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">From</label>
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                        className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">To</label>
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                        className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAssignSubjectTeacher}
                className="w-full bg-red-600 text-white font-semibold py-3 rounded-md hover:bg-red-700 transition"
              >
                Assign Subject Teacher
              </button>
            </>
          )}
        </div>

        {/* Classes List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-700 p-6 border-b">All Classes Overview</h2>
          <div className="divide-y">
            {classes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No classes found.</div>
            ) : (
              classes.map(classItem => (
                <div key={classItem.id} className="p-6 hover:bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{classItem.grade} - {classItem.section}</h3>

                  {/* Adviser row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">
                      {classItem.adviser_name ? (
                        <span className="text-green-700 flex items-center gap-1">
                          <CheckCircleIcon className="w-4 h-4" />
                          Adviser: <strong>{classItem.adviser_name}</strong>
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <XCircleIcon className="w-4 h-4" />
                          No adviser assigned
                        </span>
                      )}
                    </span>
                    {classItem.adviser_name && (
                      <button
                        onClick={() => handleUnassignAdviser(classItem)}
                        className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition"
                      >
                        Remove Adviser
                      </button>
                    )}
                  </div>

                  {/* Subject teachers */}
                  {classItem.subject_teachers && classItem.subject_teachers.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject Teachers:</p>
                      {classItem.subject_teachers.map((st, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-blue-50 rounded px-3 py-2">
                          <span className="text-sm text-gray-800">
                            <strong>{st.teacher_name}</strong> — <span className="text-blue-700">{st.subject}</span>
                            <span className="text-xs text-gray-500 ml-2">{st.day} {st.start_time}–{st.end_time}</span>
                          </span>
                          <button
                            onClick={() => handleRemoveSubjectTeacher(classItem.id, st.teacher_id)}
                            className="text-red-500 hover:text-red-700 ml-3 flex-shrink-0"
                            title="Remove"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1">No subject teachers assigned</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
