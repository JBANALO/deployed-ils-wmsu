import React, { useState, useEffect } from "react";
import api from "../../api/axiosConfig";
import { API_BASE_URL } from "../../api/config";
import GradesReportCard from "../../components/GradesReportCard";
import {
  BookOpenIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  Bars3BottomLeftIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

export default function EditGrades() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [selectedQuarter, setSelectedQuarter] = useState("q1");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("All Grades");
  const [selectedSection, setSelectedSection] = useState("All Sections");
  const [availableSections, setAvailableSections] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [adviserClassIds, setAdviserClassIds] = useState([]); // Classes where user is adviser
  const [subjectsByClass, setSubjectsByClass] = useState({}); // Map: classId -> [subjects]
  const [isAdviserViewingClass, setIsAdviserViewingClass] = useState(false); // adviser opened modal for their own class
  
  // Modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [gradeData, setGradeData] = useState({});
  const [isGradeLocked, setIsGradeLocked] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportCardStudent, setReportCardStudent] = useState(null); // null = all students, array = selected students
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  // Subjects by grade level — loaded dynamically from DB, fallback below
  const [subjectsByGrade, setSubjectsByGrade] = useState({
    "Kindergarten": ["Mother Tongue", "Filipino", "English", "Mathematics", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 1": ["Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 2": ["Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 3": ["Mother Tongue", "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 4": ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "EPP", "Music", "Arts", "Physical Education", "Health"],
    "Grade 5": ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "EPP", "Music", "Arts", "Physical Education", "Health"],
    "Grade 6": ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "EPP", "Music", "Arts", "Physical Education", "Health"],
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  // Update available sections when grade level changes
  useEffect(() => {
    if (selectedGradeLevel === "All Grades") {
      const allSections = [...new Set(students.map(s => s.section))].sort();
      setAvailableSections(allSections);
    } else {
      const sectionsForGrade = [...new Set(
        students
          .filter(s => s.gradeLevel === selectedGradeLevel)
          .map(s => s.section)
      )].sort();
      setAvailableSections(sectionsForGrade);
    }
    setSelectedSection("All Sections");
  }, [selectedGradeLevel, students]);

  // Update available subjects based on user role and grade level
  useEffect(() => {
    const updateSubjects = async () => {
      // For adviser role (or teacher with adviser assignment), show all subjects for grade
      if (userRole === 'adviser' || (userRole === 'teacher' && assignedSubjects.length === 0)) {
        // Advisers can edit all subjects for their grade
        if (selectedGradeLevel === "All Grades") {
          const allSubjects = [...new Set(Object.values(subjectsByGrade).flat())];
          setAvailableSubjects(allSubjects);
        } else if (selectedGradeLevel && selectedSection && selectedSection !== "All Sections") {
          // Try to get subjects from API based on class
          try {
            const classId = `${selectedGradeLevel.toLowerCase().replace(/\s+/g, '-')}-${selectedSection.toLowerCase().replace(/\s+/g, '-')}`;
            const response = await api.get(`/classes/${classId}/subjects`);
            setAvailableSubjects(response.data.subjects || []);
          } catch (error) {
            console.error('Error fetching class subjects, using fallback:', error);
            setAvailableSubjects(subjectsByGrade[selectedGradeLevel] || []);
          }
        } else {
          setAvailableSubjects(subjectsByGrade[selectedGradeLevel] || []);
        }
      } else if ((userRole === 'subject_teacher' || userRole === 'teacher') && assignedSubjects.length > 0) {
        // Subject teachers can only edit their assigned subjects
        setAvailableSubjects(assignedSubjects);
      } else {
        // Fallback: show all subjects for the selected grade
        setAvailableSubjects(subjectsByGrade[selectedGradeLevel] || []);
      }
    };
    updateSubjects();
  }, [userRole, assignedSubjects, selectedGradeLevel, selectedSection]);

  const fetchStudents = async () => {
    try {
      // Get user info from localStorage
      const userStr = localStorage.getItem("user");
      let currentUserRole = null;
      let userId = null;
      
      if (userStr) {
        const user = JSON.parse(userStr);
        currentUserRole = user.role;
        userId = user.id;
        setUserRole(currentUserRole);
        console.log('EditGrades - User role:', currentUserRole, 'User ID:', userId);
      }

      if (!userId) {
        console.error('No user ID found');
        setLoading(false);
        return;
      }

      // Fetch adviser classes
      let adviserClasses = [];
      try {
        const adviserResponse = await fetch(`${API_BASE_URL}/classes/adviser/${userId}`);
        if (adviserResponse.ok) {
          const data = await adviserResponse.json();
          adviserClasses = Array.isArray(data.data) ? data.data : [];
        }
      } catch (e) {
        console.error('Error fetching adviser classes:', e);
      }

      // Fetch subject teacher classes
      let subjectTeacherClasses = [];
      try {
        const stResponse = await fetch(`${API_BASE_URL}/classes/subject-teacher/${userId}`);
        if (stResponse.ok) {
          const data = await stResponse.json();
          subjectTeacherClasses = Array.isArray(data.data) ? data.data : [];
        }
      } catch (e) {
        console.error('Error fetching subject teacher classes:', e);
      }

      // Combine and deduplicate classes
      const combinedClasses = [...adviserClasses, ...subjectTeacherClasses];
      const uniqueClasses = Array.from(new Map(combinedClasses.map(c => [c.id, c])).values());
      setAssignedClasses(uniqueClasses);
      
      console.log('EditGrades - Assigned classes:', uniqueClasses.map(c => `${c.grade}-${c.section}`));

      // Track adviser class IDs for quick lookup
      const adviserIds = adviserClasses.map(c => c.id);
      setAdviserClassIds(adviserIds);
      console.log('EditGrades - Adviser class IDs:', adviserIds);

      // Build per-class subject map for subject teacher assignments
      // cls.subjects is an array returned by the API (from GROUP_CONCAT in the query)
      const classSubjectMap = {};
      subjectTeacherClasses.forEach(cls => {
        const clsSubjects = Array.isArray(cls.subjects) ? cls.subjects : (cls.subjects ? cls.subjects.split(',') : []);
        if (clsSubjects.length > 0) {
          classSubjectMap[cls.id] = clsSubjects.map(s => s.trim()).filter(s => s);
        }
      });
      setSubjectsByClass(classSubjectMap);
      console.log('EditGrades - Subjects by class:', classSubjectMap);

      // Extract all subjects the teacher can edit (global list, for backward compatibility)
      const subjects = [];
      subjectTeacherClasses.forEach(cls => {
        const clsSubjects = Array.isArray(cls.subjects) ? cls.subjects : (cls.subjects ? cls.subjects.split(',') : []);
        clsSubjects.forEach(s => {
          const trimmed = s.trim();
          if (trimmed && !subjects.includes(trimmed)) {
            subjects.push(trimmed);
          }
        });
      });
      setAssignedSubjects(subjects);
      console.log('EditGrades - Assigned subjects:', subjects);
      
      if (subjects.length > 0) {
        setSelectedSubject(subjects[0]);
      }

      // Fetch all students
      const response = await api.get('/students');
      const allStudents = response.data.data || response.data;
      
      // Filter students to only show those in assigned classes
      const normalize = str => (str || '').toString().trim().toLowerCase();
      const filteredStudents = (Array.isArray(allStudents) ? allStudents : []).filter(student => {
        return uniqueClasses.some(c => 
          normalize(c.grade) === normalize(student.gradeLevel) && 
          normalize(c.section) === normalize(student.section)
        );
      });
      
      console.log('EditGrades - Total students:', allStudents.length, '→ Filtered:', filteredStudents.length);
      setStudents(filteredStudents);

      // Fetch subjects for each assigned grade level from DB (replaces hard-coded list)
      const uniqueGrades = [...new Set(uniqueClasses.map(c => c.grade).filter(Boolean))];
      if (uniqueGrades.length > 0) {
        const gradeSubjectMap = {};
        await Promise.all(uniqueGrades.map(async (grade) => {
          try {
            // grade_levels in DB stores just the number (e.g. '3' not 'Grade 3')
            const gradeKey = grade.replace(/^Grade\s+/i, '').trim();
            const resp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`);
            const names = (resp.data?.data || []).map(s => s.name).filter(Boolean);
            if (names.length > 0) gradeSubjectMap[grade] = names; // keep 'Grade 3' as map key
          } catch (e) {
            console.warn('Could not fetch subjects for grade:', grade);
          }
        }));
        // Merge with fallback (DB results override for matching grades)
        if (Object.keys(gradeSubjectMap).length > 0) {
          setSubjectsByGrade(prev => ({ ...prev, ...gradeSubjectMap }));
          console.log('EditGrades - Loaded subjects from DB:', gradeSubjectMap);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
    }
  };

  // Open grade modal for a student
  const openGradeModal = async (student) => {
    setSelectedStudent(student);
    
    // Check if grades are locked (1 day has passed since last save)
    const lastEditTime = student.lastGradeEditTime ? new Date(student.lastGradeEditTime) : null;
    const now = new Date();
    const isLocked = lastEditTime && (now - lastEditTime) > 24 * 60 * 60 * 1000;
    
    if (isLocked) {
      setIsGradeLocked(true);
      setLockReason("Grades locked. 1 day has passed since last edit.");
    } else if (lastEditTime) {
      const hoursLeft = 24 - Math.floor((now - lastEditTime) / (60 * 60 * 1000));
      setIsGradeLocked(false);
      setLockReason(`You have ${hoursLeft} hours left to edit these grades.`);
    } else {
      setIsGradeLocked(false);
      setLockReason("");
    }
    
    // Determine student's class ID
    const studentClassId = `${(student.gradeLevel || '').toLowerCase().replace(/\s+/g, '-')}-${(student.section || '').toLowerCase().replace(/\s+/g, '-')}`;
    console.log('Opening grades for student class:', studentClassId, 'Adviser classes:', adviserClassIds);
    
    // Check if user is adviser for this class
    const isAdviserForClass = adviserClassIds.includes(studentClassId);
    
    // --- Fetch subjects for this grade directly from DB (always fresh) ---
    let dbSubjectsForGrade = [];
    try {
      // grade_levels column stores just the number e.g. '3', not 'Grade 3'
      const gradeKey = (student.gradeLevel || '').replace(/^Grade\s+/i, '').trim();
      const subjResp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`);
      dbSubjectsForGrade = (subjResp.data?.data || []).map(s => s.name).filter(Boolean);
      console.log('DB subjects for', student.gradeLevel, ':', dbSubjectsForGrade);
    } catch (e) {
      console.warn('Could not fetch subjects from DB, using fallback:', e.message);
    }
    // Fall back to hardcoded list only if DB returned nothing
    const gradeSubjectList = dbSubjectsForGrade.length > 0
      ? dbSubjectsForGrade
      : (subjectsByGrade[student.gradeLevel] || []);

    // Subjects this teacher can EDIT — only their specifically assigned subjects, regardless of adviser status
    const editableSubjectsForClass = subjectsByClass[studentClassId] || [];
    console.log(isAdviserForClass ? 'Adviser' : 'Subject teacher', '- editable subjects:', editableSubjectsForClass);

    // Track whether adviser is viewing their own class (to show full read-only view)
    setIsAdviserViewingClass(isAdviserForClass);

    // Update availableSubjects (controls which inputs are enabled)
    setAvailableSubjects(editableSubjectsForClass);
    
    // Fetch grades from API
    let studentGrades = {};
    try {
      const gradesResponse = await api.get(`/students/${student.id}/grades`);
      studentGrades = gradesResponse.data || {};
      console.log('Fetched grades from API:', studentGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }

    // Adviser sees ALL subjects; subject teacher sees only their assigned subjects
    const subjectsToShow = isAdviserForClass ? gradeSubjectList : editableSubjectsForClass;
    const initialGrades = {};
    subjectsToShow.forEach(subject => {
      initialGrades[subject] = {
        q1: studentGrades[subject]?.q1 || 0,
        q2: studentGrades[subject]?.q2 || 0,
        q3: studentGrades[subject]?.q3 || 0,
        q4: studentGrades[subject]?.q4 || 0,
      };
    });
    
    setGradeData(initialGrades);
    console.log('Grade modal opened - showing subjects:', subjectsToShow, 'grades:', initialGrades);
    setShowGradeModal(true);
  };

  // Calculate average for a subject
  const calculateSubjectAverage = (subject) => {
    const grades = gradeData[subject];
    if (!grades) return 0;
    
    if (selectedQuarter === "all") {
      // Average of all quarters
      const values = [grades.q1, grades.q2, grades.q3, grades.q4].filter(v => v);
      return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0;
    } else {
      // Single quarter
      return grades[selectedQuarter] || 0;
    }
  };

  // Calculate final average based on selected quarter(s)
  const calculateFinalAverage = () => {
    let subjects = Object.keys(gradeData);
    
    // Filter to available subjects for subject teachers (including teacher role with assigned subjects)
    const isSubjectTeacherMode = (userRole === 'subject_teacher' || userRole === 'teacher') && availableSubjects.length > 0;
    if (isSubjectTeacherMode) {
      subjects = subjects.filter(s => availableSubjects.includes(s));
    }
    
    if (subjects.length === 0) return 0;
    
    let total = 0;
    let count = 0;
    if (selectedQuarter === "all") {
      // Average of all quarters for all subjects (skip ungraded subjects)
      subjects.forEach(subject => {
        const subAvg = parseFloat(calculateSubjectAverage(subject)) || 0;
        if (subAvg > 0) {
          total += subAvg;
          count++;
        }
      });
    } else {
      // Only selected quarter — only count subjects where a grade has been entered
      subjects.forEach(subject => {
        const gradeVal = parseFloat(gradeData[subject][selectedQuarter]) || 0;
        if (gradeVal > 0) {
          total += gradeVal;
          count++;
        }
      });
    }
    
    return count > 0 ? (total / count).toFixed(2) : 0;
  };

  // Get remarks based on average
  const getRemarks = (average) => {
    if (average >= 90) return "Outstanding";
    if (average >= 85) return "Very Satisfactory";
    if (average >= 80) return "Satisfactory";
    if (average >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  };

  // Handle grade input change
  const handleGradeChange = (subject, quarter, value) => {
    // Allow empty value (for clearing)
    if (value === '') {
      setGradeData(prev => ({
        ...prev,
        [subject]: {
          ...prev[subject],
          [quarter]: ''
        }
      }));
      return;
    }
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0));
    setGradeData(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [quarter]: numValue
      }
    }));
  };

  // Clear grade value
  const clearGrade = (subject, quarter) => {
    setGradeData(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [quarter]: ''
      }
    }));
  };

  // Save grades to backend
  const saveGrades = async () => {
    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
      alert("❌ Session expired. Please login again.");
      window.location.href = '/login';
      return;
    }

    if (isGradeLocked) {
      alert("❌ These grades are locked and cannot be edited.");
      return;
    }

    // Check for unauthorized subject edits (for subject teachers including teacher role with assigned subjects)
    const isSubjectTeacherMode = (userRole === 'subject_teacher' || userRole === 'teacher') && availableSubjects.length > 0;
    if (isSubjectTeacherMode) {
      const editedSubjects = Object.keys(gradeData).filter(subject => {
        const quarterData = gradeData[subject];
        if (selectedQuarter === "all") {
          return quarterData.q1 || quarterData.q2 || quarterData.q3 || quarterData.q4;
        } else {
          return quarterData[selectedQuarter];
        }
      });
      
      const unauthorizedSubjects = editedSubjects.filter(s => !availableSubjects.includes(s));
      if (unauthorizedSubjects.length > 0) {
        alert(`❌ You don't have permission to edit: ${unauthorizedSubjects.join(', ')}`);
        return;
      }
    }

    const finalAverage = calculateFinalAverage();
    const quarterMap = {
      'q1': 'q1',
      'q2': 'q2', 
      'q3': 'q3',
      'q4': 'q4',
      'all': 'all'
    };
    const quarterValue = quarterMap[selectedQuarter] || 'q1';
    
    // Extract grades for the selected quarter(s)
    const quarterGrades = {};
    Object.keys(gradeData).forEach(subject => {
      // For subject teachers (including teacher role with assigned subjects), only include authorized subjects
      const isSubjectTeacherMode = (userRole === 'subject_teacher' || userRole === 'teacher') && availableSubjects.length > 0;
      if (isSubjectTeacherMode && !availableSubjects.includes(subject)) {
        return;
      }
      
      if (selectedQuarter === "all") {
        quarterGrades[subject] = {
          q1: gradeData[subject].q1 || 0,
          q2: gradeData[subject].q2 || 0,
          q3: gradeData[subject].q3 || 0,
          q4: gradeData[subject].q4 || 0,
        };
      } else {
        // Send a plain number so the backend can store it directly in the quarter column
        quarterGrades[subject] = gradeData[subject][selectedQuarter] || 0;
      }
    });

    try {
      const response = await api.put(`/students/${selectedStudent.id}/grades`, {
        grades: quarterGrades,
        average: parseFloat(finalAverage),
        quarter: quarterValue,
        lastGradeEditTime: new Date().toISOString()
      });

      if (response.data?.success) {
        alert(`✅ Grades saved successfully! You have 24 hours to edit them again.`);
        fetchStudents();
        setShowGradeModal(false);
      } else {
        alert(`❌ Failed to save grades: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (apiError) {
      console.error('Error saving grades:', apiError);
      alert(`❌ Error saving grades: ${apiError.response?.data?.message || apiError.message}`);
    }
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    // Filter by search query (name or LRN)
    const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lrn.includes(searchQuery);
    
    // Filter by grade level
    const matchesGrade = selectedGradeLevel === "All Grades" || student.gradeLevel === selectedGradeLevel;
    
    // Filter by section
    const matchesSection = selectedSection === "All Sections" || student.section === selectedSection;
    
    return matchesSearch && matchesGrade && matchesSection;
  });

  // Calculate class statistics
  const classAverage = students.length > 0
    ? (students.reduce((sum, s) => sum + (s.average || 0), 0) / students.length).toFixed(2)
    : 0;

  const highestGrade = students.length > 0
    ? Math.max(...students.map(s => s.average || 0))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 flex items-center justify-between print:hidden mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpenIcon className="w-10 h-10 text-red-800" />
          Edit Grades
        </h2>

        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm font-medium shadow-md">
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export Grades
          </button>
          <button className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 text-sm font-medium shadow-md">
            <PrinterIcon className="w-5 h-5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
            </div>
            <UserGroupIcon className="w-12 h-12 text-red-600 opacity-80" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Class Average</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{classAverage}</p>
            </div>
            <ArrowTrendingUpIcon className="w-12 h-12 text-orange-600 opacity-80" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Highest Grade</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{highestGrade}</p>
            </div>
            <AcademicCapIcon className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Graded Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {students.filter(s => s.average > 0).length}
              </p>
            </div>
            <Bars3BottomLeftIcon className="w-12 h-12 text-purple-600 opacity-80" />
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Quarter</label>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
            >
              <option value="q1">Quarter 1</option>
              <option value="q2">Quarter 2</option>
              <option value="q3">Quarter 3</option>
              <option value="q4">Quarter 4</option>
              <option value="all">📊 All Quarters</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
            <select 
              value={selectedGradeLevel}
              onChange={(e) => {
                setSelectedGradeLevel(e.target.value);
                setSelectedSection("All Sections");
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>All Grades</option>
              <option>Kindergarten</option>
              <option>Grade 1</option>
              <option>Grade 2</option>
              <option>Grade 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>All Sections</option>
              {availableSections.map((section) => (
                <option key={section}>{section}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
            <input
              type="text"
              placeholder="Name or LRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Student List - {selectedQuarter === 'q1' ? 'Quarter 1' : selectedQuarter === 'q2' ? 'Quarter 2' : selectedQuarter === 'q3' ? 'Quarter 3' : selectedQuarter === 'q4' ? 'Quarter 4' : 'All Quarters'} | Click Name to Edit Grades
            </h3>
            <p className="text-sm text-gray-600 mt-1">Click on any student's name to edit their grades</p>
          </div>
          <div className="flex gap-2 items-center">
            {selectedStudentIds.size > 0 && (
              <button
                onClick={() => {
                  const selected = filteredStudents.filter(s => selectedStudentIds.has(s.id));
                  setReportCardStudent(selected);
                  setShowReportCard(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title={`Print report cards for ${selectedStudentIds.size} selected student(s)`}
              >
                <PrinterIcon className="w-5 h-5" />
                Print Selected ({selectedStudentIds.size})
              </button>
            )}
            <button
              onClick={() => { setReportCardStudent(null); setShowReportCard(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Export report cards for all visible students"
            >
              <img src="/export-icon.svg" alt="Export" className="w-5 h-5" />
              Export All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer rounded"
                    title="Select all visible students"
                  />
                </th>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">LRN</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Grade & Section</th>
                <th className="px-6 py-4 text-center">Final Average</th>
                <th className="px-6 py-4">Remarks</th>                <th className="px-6 py-4 text-center">Report Card</th>              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents
                  .sort((a, b) => (b.average || 0) - (a.average || 0))
                  .map((student, index) => (
                    <tr key={student.id} className={`hover:bg-gray-50 transition ${selectedStudentIds.has(student.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 cursor-pointer rounded"
                        />
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600 font-mono">
                        {student.lrn}
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => openGradeModal(student)}
                          className="font-medium text-red-600 hover:text-red-800 hover:underline transition"
                        >
                          {student.fullName}
                        </button>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700">
                        {student.gradeLevel} - {student.section}
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-gray-900">
                        {student.average || "No grades yet"}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          (student.average || 0) >= 90 ? "bg-green-100 text-green-800" :
                          (student.average || 0) >= 85 ? "bg-blue-100 text-blue-800" :
                          (student.average || 0) >= 80 ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {student.average ? getRemarks(student.average) : "Not graded"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => { setReportCardStudent(student); setShowReportCard(true); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                          title="Print report card for this student"
                        >
                          <PrinterIcon className="w-3.5 h-3.5" />
                          Print
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {filteredStudents.length} student(s)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Class Average:</span>
            <span className="px-6 py-2 bg-red-100 text-red-800 rounded-lg font-bold">{classAverage}</span>
          </div>
        </div>
      </div>

      {/* Grade Edit Modal */}
      {showGradeModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-red-600 text-white px-8 py-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-2xl font-bold">{selectedStudent.fullName}</h3>
                <p className="text-red-100 text-sm mt-1">
                  {selectedStudent.gradeLevel} - {selectedStudent.section} | LRN: {selectedStudent.lrn}
                </p>
                {lockReason && (
                  <p className={`text-sm mt-2 font-semibold ${isGradeLocked ? 'text-red-200' : 'text-yellow-200'}`}>
                    {lockReason}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowGradeModal(false)}
                className="text-white hover:text-red-200 transition"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>

            {/* Grades Table - Show Only Total Q1 Grade */}
            <div className="p-8">
              {isGradeLocked && (
                <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-800 font-semibold">🔒 These grades are locked and cannot be edited.</p>
                </div>
              )}
              {isAdviserViewingClass && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <span className="font-semibold">📋 Adviser View:</span> You can see all subjects and grades entered by subject teachers. You can only edit subjects assigned to you.
                </div>
              )}
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border">Subject</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 border">Q1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(gradeData)
                      .filter(subject => subject !== 'Total Q1')
                      .map((subject) => {
                        const canEdit = availableSubjects.includes(subject);
                        const hasGrade = gradeData[subject]?.q1 && gradeData[subject].q1 !== 0;
                        
                        return (
                          <tr key={subject} className={canEdit ? 'hover:bg-gray-50' : 'bg-gray-50'}>
                            <td className="px-4 py-3 font-medium border" style={{color: canEdit ? '#111827' : '#6b7280'}}>
                              {subject}
                              {!canEdit && isAdviserViewingClass && (
                                <span className="ml-2 text-xs text-gray-400 font-normal">🔒 subject teacher</span>
                              )}
                            </td>
                            <td className="px-4 py-3 border">
                              <div className="flex items-center justify-center gap-1">
                                {canEdit ? (
                                  <>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="-"
                                      value={gradeData[subject]?.q1 || ''}
                                      onChange={(e) => handleGradeChange(subject, 'q1', e.target.value)}
                                      disabled={isGradeLocked}
                                      className={`w-16 text-center border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${isGradeLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    />
                                    {!isGradeLocked && hasGrade && (
                                      <button
                                        type="button"
                                        onClick={() => handleGradeChange(subject, 'q1', '')}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-1.5 py-1 transition text-sm font-bold"
                                        title="Clear grade"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className={`text-lg font-semibold ${hasGrade ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {hasGrade ? gradeData[subject].q1 : '—'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-300">
                      <td className="px-4 py-4 text-right font-bold text-gray-900 border">
                        Total Q1 Grade:
                      </td>
                      <td className="px-4 py-4 text-center font-bold border">
                        <span className="text-3xl text-blue-700">
                          {(() => {
                            const q1Grades = Object.keys(gradeData)
                              .filter(subject => subject !== 'Total Q1')
                              .map(subject => gradeData[subject]?.q1)
                              .filter(grade => grade !== '' && grade !== 0 && grade !== null && grade !== undefined);
                            
                            if (q1Grades.length === 0) return '-';
                            const avg = (q1Grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / q1Grades.length).toFixed(2);
                            return avg;
                          })()}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={saveGrades}
                  disabled={isGradeLocked}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition shadow-lg ${
                    isGradeLocked
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  💾 Save Grades
                </button>
                <button
                  onClick={() => setShowGradeModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      {showReportCard && (
        <GradesReportCard 
          students={
            Array.isArray(reportCardStudent)
              ? reportCardStudent
              : (reportCardStudent ? [reportCardStudent] : filteredStudents)
          }
          quarter={selectedQuarter}
          gradeLevel={
            Array.isArray(reportCardStudent)
              ? (reportCardStudent[0]?.gradeLevel || selectedGradeLevel)
              : (reportCardStudent ? reportCardStudent.gradeLevel : (selectedGradeLevel === "All Grades" ? "All Grades" : selectedGradeLevel))
          }
          section={
            Array.isArray(reportCardStudent)
              ? (reportCardStudent[0]?.section || selectedSection)
              : (reportCardStudent ? reportCardStudent.section : selectedSection)
          }
          classId={
            Array.isArray(reportCardStudent)
              ? (reportCardStudent[0]
                ? `${(reportCardStudent[0].gradeLevel || '').toLowerCase().replace(/\s+/g, '-')}-${(reportCardStudent[0].section || '').toLowerCase().replace(/\s+/g, '-')}`
                : null)
              : (reportCardStudent
                ? `${(reportCardStudent.gradeLevel || '').toLowerCase().replace(/\s+/g, '-')}-${(reportCardStudent.section || '').toLowerCase().replace(/\s+/g, '-')}`
                : (selectedGradeLevel !== "All Grades" && selectedSection !== "All Sections"
                  ? `${selectedGradeLevel.toLowerCase().replace(/\s+/g, '-')}-${selectedSection.toLowerCase().replace(/\s+/g, '-')}`
                  : null))
          }
          onClose={() => { setShowReportCard(false); setReportCardStudent(null); }}
        />
      )}
    </div>
  );
}