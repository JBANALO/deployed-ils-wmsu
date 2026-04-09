import React, { useState, useEffect, useRef } from "react";
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
import {
  appendSchoolYearId,
  dedupeTeacherClasses,
  getTeacherActiveSchoolYearId,
  getTeacherViewingSchoolYearId,
  isTeacherViewOnlyMode,
  setTeacherActiveSchoolYearId,
  setTeacherViewingSchoolYearId,
} from "../../utils/teacherSchoolYear";
import { toast } from 'react-toastify';

export default function EditGrades() {
  const getStudentGradeLevel = (student) => student?.gradeLevel || student?.grade_level || "";
  const getStudentSection = (student) => student?.section || student?.Section || "";
  const normalizeText = (value) => String(value || "").trim().toLowerCase();
  const normalizeClassSlug = (grade, section) => `${String(grade || '').toLowerCase().replace(/\s+/g, '-')}-${String(section || '').toLowerCase().replace(/\s+/g, '-')}`;
  const parseSubjectList = (rawValue) => {
    if (Array.isArray(rawValue)) return rawValue.map((item) => String(item || '').trim()).filter(Boolean);
    if (typeof rawValue === 'string') {
      return rawValue.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };
  const dedupeSubjects = (values = []) => {
    const seen = new Set();
    const result = [];
    values.forEach((item) => {
      const key = normalizeText(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });
    return result;
  };
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
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [adviserClassIds, setAdviserClassIds] = useState([]); // Classes where user is adviser
  const [subjectsByClass, setSubjectsByClass] = useState({}); // Map: classId -> [subjects]
  const [isAdviserViewingClass, setIsAdviserViewingClass] = useState(false); // adviser opened modal for their own class
  const [progressData, setProgressData] = useState({ summary: { percent: 0, totalStudents: 0, gradedStudents: 0 }, items: [], quarter: 'q1' });
  const [progressLoading, setProgressLoading] = useState(false);
  
  // Modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [gradeData, setGradeData] = useState({});
  const [initialGradeData, setInitialGradeData] = useState({});
  const [isGradeLocked, setIsGradeLocked] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [quarterEndDates, setQuarterEndDates] = useState({ q1: null, q2: null, q3: null, q4: null });
  const [gradeEditLocks, setGradeEditLocks] = useState({});
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportCardStudent, setReportCardStudent] = useState(null); // null = all students, array = selected students
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [activeSchoolYearId, setActiveSchoolYearId] = useState(() => getTeacherActiveSchoolYearId());
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(() => getTeacherViewingSchoolYearId());
  const lastKnownActiveSchoolYearIdRef = useRef(null);
  const isViewOnlyMode = isTeacherViewOnlyMode(selectedSchoolYearId, activeSchoolYearId);

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

  const fetchActiveSchoolYear = async () => {
    try {
      const res = await api.get('/school-years/active');
      const activeSy = res.data?.data || res.data;
      if (!activeSy?.id) return;

      const nextActiveId = String(activeSy.id);
      const previousActiveId = lastKnownActiveSchoolYearIdRef.current;

      setActiveSchoolYearId(nextActiveId);
      setTeacherActiveSchoolYearId(nextActiveId);

      const shouldAutoFollow =
        !selectedSchoolYearId ||
        !previousActiveId ||
        String(selectedSchoolYearId) === String(previousActiveId);

      if (shouldAutoFollow && String(selectedSchoolYearId || '') !== nextActiveId) {
        setSelectedSchoolYearId(nextActiveId);
        setTeacherViewingSchoolYearId(nextActiveId);
      }

      lastKnownActiveSchoolYearIdRef.current = nextActiveId;
    } catch (error) {
      console.warn('Could not load active school year:', error.message);
    }
  };

  useEffect(() => {
    fetchActiveSchoolYear();

    const interval = setInterval(() => {
      fetchActiveSchoolYear();
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedSchoolYearId]);

  useEffect(() => {
    if (selectedSchoolYearId) {
      setTeacherViewingSchoolYearId(selectedSchoolYearId);
    }
  }, [selectedSchoolYearId]);

  useEffect(() => {
    fetchStudents();
  }, [selectedSchoolYearId]);

  useEffect(() => {
    const fetchQuarterDeadlines = async () => {
      try {
        const syResponse = await api.get('/school-years');
        const schoolYears = syResponse.data?.data || [];
        const target = schoolYears.find((item) => String(item.id) === String(selectedSchoolYearId || activeSchoolYearId));

        if (!target) {
          setQuarterEndDates({ q1: null, q2: null, q3: null, q4: null });
          return;
        }

        setQuarterEndDates({
          q1: target.q1_end_date || null,
          q2: target.q2_end_date || null,
          q3: target.q3_end_date || null,
          q4: target.q4_end_date || null,
        });
      } catch (error) {
        console.error('Failed to load quarter end dates:', error.message || error);
        setQuarterEndDates({ q1: null, q2: null, q3: null, q4: null });
      }
    };

    fetchQuarterDeadlines();
  }, [selectedSchoolYearId, activeSchoolYearId]);

  useEffect(() => {
    fetchProgress(selectedQuarter);
  }, [selectedQuarter, selectedSchoolYearId]);

  const getQuarterDeadline = (qKey) => {
    const raw = quarterEndDates?.[qKey] || null;
    if (!raw) return null;
    const d = new Date(raw);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const isQuarterClosed = (qKey) => {
    if (userRole === 'admin') return false;
    const deadline = getQuarterDeadline(qKey);
    if (!deadline) return false;
    return new Date() > deadline;
  };

  const quarterLabel = (qKey) => {
    const map = { q1: 'Quarter 1', q2: 'Quarter 2', q3: 'Quarter 3', q4: 'Quarter 4' };
    return map[qKey] || qKey?.toUpperCase() || '';
  };

  const isEditWindowLocked = (subject, qKey) => {
    return Boolean(gradeEditLocks?.[subject]?.[qKey]?.expired);
  };

  useEffect(() => {
    if (!showGradeModal || !selectedStudent) return;

    const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
    const relevantQuarters = selectedQuarter === 'all'
      ? quarterOrder
      : [selectedQuarter];
    const closedQuarters = relevantQuarters.filter((q) => isQuarterClosed(q));
    const modalSubjects = Object.keys(gradeData || {}).filter((subject) => subject !== 'Total Q1');
    const quarterFullyLockedByWindow = (qKey) => {
      if (modalSubjects.length === 0) return false;
      let hasLocked = false;
      let hasEditable = false;
      modalSubjects.forEach((subject) => {
        if (isEditWindowLocked(subject, qKey)) {
          hasLocked = true;
        } else {
          hasEditable = true;
        }
      });
      return hasLocked && !hasEditable;
    };
    const windowLockedQuarters = relevantQuarters.filter((q) => quarterFullyLockedByWindow(q));

    if (selectedQuarter === 'all') {
      const lockedQuarterSet = new Set([...closedQuarters, ...windowLockedQuarters]);
      const allLocked = relevantQuarters.length > 0 && relevantQuarters.every((q) => lockedQuarterSet.has(q));
      setIsGradeLocked(allLocked);

      if (allLocked) {
        setLockReason('All quarters are closed or beyond the 24-hour edit window.');
      } else if (lockedQuarterSet.size > 0) {
        const labels = [...lockedQuarterSet].map(quarterLabel).join(', ');
        setLockReason(`${labels} are locked. You can still edit open quarters within 24 hours.`);
      } else {
        setLockReason('');
      }
    } else {
      const quarterClosed = isQuarterClosed(selectedQuarter);
      const quarterWindowLocked = quarterFullyLockedByWindow(selectedQuarter);
      const fullyLocked = quarterClosed || quarterWindowLocked;
      setIsGradeLocked(fullyLocked);

      if (quarterClosed) {
        setLockReason(`${quarterLabel(selectedQuarter)} is already closed for editing.`);
      } else if (quarterWindowLocked) {
        setLockReason(`${quarterLabel(selectedQuarter)} can only be edited within 24 hours after last save.`);
      } else {
        setLockReason('');
      }
    }
  }, [showGradeModal, selectedStudent, selectedQuarter, quarterEndDates, userRole, gradeEditLocks, gradeData]);

  // Update available sections when grade level changes
  useEffect(() => {
    if (selectedGradeLevel === "All Grades") {
      const allSections = [...new Set(students.map(s => getStudentSection(s)).filter(Boolean))].sort();
      setAvailableSections(allSections);
    } else {
      const sectionsForGrade = [...new Set(
        students
          .filter(s => getStudentGradeLevel(s) === selectedGradeLevel)
          .map(s => getStudentSection(s))
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
            const response = await api.get(`/classes/${classId}/subjects`, { params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {} });
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

      const schoolYearForRequests = selectedSchoolYearId || activeSchoolYearId;

      // Fetch adviser classes
      let adviserClasses = [];
      try {
        const adviserResponse = await fetch(appendSchoolYearId(`${API_BASE_URL}/classes/adviser/${userId}`, schoolYearForRequests));
        if (adviserResponse.ok) {
          const data = await adviserResponse.json();
          adviserClasses = Array.isArray(data.data) ? data.data : [];
        }
      } catch (e) {
        console.error('Error fetching adviser classes:', e);
      }

      // Fallback: if no adviser classes by ID, search by adviser_name
      if (adviserClasses.length === 0 && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.firstName && user.lastName) {
            const allClassesResp = await fetch(appendSchoolYearId(`${API_BASE_URL}/classes`, schoolYearForRequests));
            if (allClassesResp.ok) {
              const allClassesData = await allClassesResp.json();
              const allClasses = Array.isArray(allClassesData)
                ? allClassesData
                : (Array.isArray(allClassesData.data) ? allClassesData.data : []);
              adviserClasses = allClasses.filter(c =>
                c.adviser_name &&
                c.adviser_name.includes(user.firstName) &&
                c.adviser_name.includes(user.lastName)
              );
            }
          }
        } catch (fbErr) {
          console.warn('EditGrades adviser-name fallback failed:', fbErr.message);
        }
      }

      // Fetch subject teacher classes
      let subjectTeacherClasses = [];
      try {
        const stResponse = await fetch(appendSchoolYearId(`${API_BASE_URL}/classes/subject-teacher/${userId}`, schoolYearForRequests));
        if (stResponse.ok) {
          const data = await stResponse.json();
          subjectTeacherClasses = Array.isArray(data.data) ? data.data : [];
        }
      } catch (e) {
        console.error('Error fetching subject teacher classes:', e);
      }

      // Combine and deduplicate classes
      const combinedClasses = [...adviserClasses, ...subjectTeacherClasses];
      const uniqueClasses = dedupeTeacherClasses(combinedClasses);
      setAssignedClasses(uniqueClasses);
      
      console.log('EditGrades - Assigned classes:', uniqueClasses.map(c => `${c.grade}-${c.section}`));

      // Track adviser class IDs as slugs matching studentClassId format in openGradeModal
      const adviserIds = adviserClasses.map(c => {
        return normalizeClassSlug(c.grade || c.grade_level, c.section);
      });
      setAdviserClassIds(adviserIds);
      console.log('EditGrades - Adviser class slugs:', adviserIds);

      // Build per-class subject map for subject teacher assignments
      // API returns subjects_teaching (GROUP_CONCAT), and cls.id is DB integer — so key by slug
      const classSubjectMap = {};
      subjectTeacherClasses.forEach(cls => {
        const raw = cls.subjects_teaching || cls.subjects || '';
        const clsSubjects = parseSubjectList(raw);
        if (clsSubjects.length > 0) {
          const slug = normalizeClassSlug(cls.grade || cls.grade_level, cls.section);
          classSubjectMap[slug] = dedupeSubjects(clsSubjects);
        }
      });
      setSubjectsByClass(classSubjectMap);
      console.log('EditGrades - Subjects by class:', classSubjectMap);

      // Extract all subjects the teacher can edit (global list, for backward compatibility)
      const subjects = [];
      subjectTeacherClasses.forEach(cls => {
        const clsSubjects = parseSubjectList(cls.subjects_teaching || cls.subjects || '');
        clsSubjects.forEach(s => {
          const trimmed = s.trim();
          if (trimmed && !subjects.some((item) => normalizeText(item) === normalizeText(trimmed))) {
            subjects.push(trimmed);
          }
        });
      });
      setAssignedSubjects(subjects);
      console.log('EditGrades - Assigned subjects:', subjects);
      
      if (subjects.length > 0) {
        setSelectedSubject(subjects[0]);
      }

      // Fetch grading progress for this teacher
      fetchProgress(selectedQuarter);

      // Fetch students in teacher scope so averages/remarks reflect only allowed subject/class scope.
      // Fallback to class-filtered all-students if teacherId endpoint is unavailable.
      let scopedStudents = [];
      try {
        const scopedResponse = await api.get('/students', {
          params: {
            teacherId: userId,
            ...(schoolYearForRequests ? { schoolYearId: schoolYearForRequests } : {})
          }
        });
        scopedStudents = scopedResponse.data?.data || scopedResponse.data || [];
      } catch (scopedErr) {
        console.warn('EditGrades - teacher scoped students failed, using fallback:', scopedErr.message || scopedErr);
        const response = await api.get('/students', { params: schoolYearForRequests ? { schoolYearId: schoolYearForRequests } : {} });
        const allStudents = response.data.data || response.data;
        const normalize = str => (str || '').toString().trim().toLowerCase();
        scopedStudents = (Array.isArray(allStudents) ? allStudents : []).filter(student => {
          return uniqueClasses.some(c =>
            normalize(c.grade) === normalize(getStudentGradeLevel(student)) &&
            normalize(c.section) === normalize(getStudentSection(student))
          );
        });
      }

      console.log('EditGrades - scoped students:', Array.isArray(scopedStudents) ? scopedStudents.length : 0);
      setStudents(Array.isArray(scopedStudents) ? scopedStudents : []);

      // Fetch subjects for each assigned grade level from DB (replaces hard-coded list)
      const uniqueGrades = [...new Set(uniqueClasses.map(c => c.grade).filter(Boolean))];
      if (uniqueGrades.length > 0) {
        const gradeSubjectMap = {};
        await Promise.all(uniqueGrades.map(async (grade) => {
          try {
            // grade_levels in DB stores just the number (e.g. '3' not 'Grade 3')
            const gradeKey = grade.replace(/^Grade\s+/i, '').trim();
            const resp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`, { params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {} });
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

  const fetchProgress = async (quarter = 'q1') => {
    try {
      setProgressLoading(true);
      const response = await api.get('/grades/progress', { params: { quarter, ...(selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}) } });
      const data = response.data?.data || {};
      setProgressData({
        summary: data.summary || { percent: 0, totalStudents: 0, gradedStudents: 0 },
        items: Array.isArray(data.items) ? data.items : [],
        quarter: data.quarter || quarter
      });
    } catch (error) {
      console.error('Error fetching grade progress:', error.message || error);
    } finally {
      setProgressLoading(false);
    }
  };

  // Open grade modal for a student
  const openGradeModal = async (student) => {
    setSelectedStudent(student);
    setGradeEditLocks({});

    const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
    const relevantQuarters = selectedQuarter === 'all'
      ? quarterOrder
      : quarterOrder.slice(0, quarterOrder.indexOf(selectedQuarter) + 1);
    const closedQuarters = relevantQuarters.filter((q) => isQuarterClosed(q));

    if (selectedQuarter === 'all') {
      const allClosed = relevantQuarters.length > 0 && closedQuarters.length === relevantQuarters.length;
      setIsGradeLocked(allClosed);
      if (allClosed) {
        setLockReason('All quarters are already closed for editing.');
      } else if (closedQuarters.length > 0) {
        setLockReason(`${closedQuarters.map(quarterLabel).join(', ')} are closed. You can still edit open quarters.`);
      } else {
        setLockReason('');
      }
    } else {
      const quarterClosed = isQuarterClosed(selectedQuarter);
      setIsGradeLocked(quarterClosed);
      setLockReason(quarterClosed ? `${quarterLabel(selectedQuarter)} is already closed for editing.` : '');
    }
    
    // Determine student's class ID
    const studentClassId = normalizeClassSlug(getStudentGradeLevel(student), getStudentSection(student));
    console.log('Opening grades for student class:', studentClassId, 'Adviser classes:', adviserClassIds);
    
    // Check if user is adviser for this class
    const isAdviserForClass = adviserClassIds.includes(studentClassId);
    
    // --- Fetch subjects for this grade directly from DB (always fresh) ---
    let dbSubjectsForGrade = [];
    try {
      // grade_levels column stores just the number e.g. '3', not 'Grade 3'
      const gradeKey = (getStudentGradeLevel(student) || '').replace(/^Grade\s+/i, '').trim();
      const subjResp = await api.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`, { params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {} });
      dbSubjectsForGrade = (subjResp.data?.data || []).map(s => s.name).filter(Boolean);
      console.log('DB subjects for', getStudentGradeLevel(student), ':', dbSubjectsForGrade);
    } catch (e) {
      console.warn('Could not fetch subjects from DB, using fallback:', e.message);
    }
    // Fall back to hardcoded list only if DB returned nothing
    const gradeSubjectList = dbSubjectsForGrade.length > 0
      ? dbSubjectsForGrade
      : (subjectsByGrade[getStudentGradeLevel(student)] || []);

    // Always re-fetch subject assignments fresh to avoid stale cached state
    let freshSubjectsForClass = subjectsByClass[studentClassId] || [];
    try {
      const userStr = localStorage.getItem('user');
      const freshUserId = userStr ? (JSON.parse(userStr).id) : null;
      const schoolYearForRequests = selectedSchoolYearId || activeSchoolYearId;
      if (freshUserId) {
        const stResp = await fetch(appendSchoolYearId(`${API_BASE_URL}/classes/subject-teacher/${freshUserId}`, schoolYearForRequests));
        if (stResp.ok) {
          const stData = await stResp.json();
          const stClasses = Array.isArray(stData.data) ? stData.data : [];
          const matchingClass = stClasses.find(cls => {
            return normalizeClassSlug(cls.grade || cls.grade_level, cls.section) === studentClassId;
          });
          if (matchingClass) {
            const freshList = dedupeSubjects(parseSubjectList(matchingClass.subjects_teaching || matchingClass.subjects || ''));
            if (freshList.length > 0) {
              freshSubjectsForClass = freshList;
              setSubjectsByClass(prev => ({ ...prev, [studentClassId]: freshList }));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not refresh subject assignments:', e.message);
    }

    // Fallback: if endpoint did not return assignments, derive from active-year class payload.
    if (freshSubjectsForClass.length === 0) {
      try {
        const userStr = localStorage.getItem('user');
        const activeUser = userStr ? JSON.parse(userStr) : null;
        const fullName = `${activeUser?.firstName || ''} ${activeUser?.lastName || ''}`.trim().toLowerCase();
        const schoolYearForRequests = selectedSchoolYearId || activeSchoolYearId;
        const classesResp = await fetch(appendSchoolYearId(`${API_BASE_URL}/classes`, schoolYearForRequests));
        if (classesResp.ok) {
          const classesPayload = await classesResp.json();
          const allClasses = Array.isArray(classesPayload)
            ? classesPayload
            : (Array.isArray(classesPayload?.data) ? classesPayload.data : []);
          const match = allClasses.find((cls) => normalizeClassSlug(cls.grade || cls.grade_level, cls.section) === studentClassId);
          const stRows = Array.isArray(match?.subject_teachers) ? match.subject_teachers : [];
          const derived = dedupeSubjects(
            stRows
              .filter((row) => {
                const byId = String(row.teacher_id || '').trim() === String(activeUser?.id || '').trim();
                const byName = fullName && String(row.teacher_name || '').trim().toLowerCase() === fullName;
                return byId || byName;
              })
              .map((row) => row.subject)
              .filter(Boolean)
          );
          if (derived.length > 0) {
            freshSubjectsForClass = derived;
            setSubjectsByClass(prev => ({ ...prev, [studentClassId]: derived }));
          }
        }
      } catch (fallbackError) {
        console.warn('Could not derive assignments from classes fallback:', fallbackError.message);
      }
    }
    // Subjects this teacher can EDIT — only their specifically assigned subjects, regardless of adviser status
    const editableSubjectsForClass = freshSubjectsForClass;
    console.log(isAdviserForClass ? 'Adviser' : 'Subject teacher', '- editable subjects:', editableSubjectsForClass);

    // Track whether adviser is viewing their own class (to show full read-only view)
    setIsAdviserViewingClass(isAdviserForClass);

    // Update availableSubjects (controls which inputs are enabled)
    // Both advisers and subject teachers can only edit their specifically assigned subjects
    setAvailableSubjects(editableSubjectsForClass);
    
    // Fetch grades from API
    let studentGrades = {};
    try {
      const gradeParams = {
        ...(selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}),
        includeLocks: 1
      };
      const gradesResponse = await api.get(`/students/${student.id}/grades`, { params: gradeParams });
      const payload = gradesResponse.data || {};
      setGradeEditLocks(payload.__meta?.editWindowLocks || {});
      studentGrades = Object.fromEntries(
        Object.entries(payload).filter(([key]) => key !== '__meta')
      );
      console.log('Fetched grades from API:', studentGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }

    // Adviser sees ALL subjects; subject teacher sees only their assigned subjects
    // Always prefer admin-configured subjects as the source of truth
    let subjectsToShow;
    if (isAdviserForClass) {
      // Adviser sees all admin-configured subjects for the grade level
      subjectsToShow = gradeSubjectList;
    } else if (gradeSubjectList.length > 0) {
      // Subject teacher: only show their assigned subjects that admin has configured for this grade
      subjectsToShow = editableSubjectsForClass.filter(s => gradeSubjectList.includes(s));
      // If nothing intersects (edge case), fall back to their assigned subjects
      if (subjectsToShow.length === 0) subjectsToShow = editableSubjectsForClass;
    } else {
      // Admin hasn't configured subjects for this grade yet — fall back to teacher's assigned subjects
      subjectsToShow = editableSubjectsForClass;
    }
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
    setInitialGradeData(JSON.parse(JSON.stringify(initialGrades)));
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

    if (isViewOnlyMode) {
      alert("❌ Past school years are view-only. Grade editing is disabled.");
      return;
    }

    const hasChangedQuarterValue = (subject, quarterKey) => {
      const currentVal = Number(gradeData?.[subject]?.[quarterKey] || 0);
      const initialVal = Number(initialGradeData?.[subject]?.[quarterKey] || 0);
      return currentVal !== initialVal;
    };

    const changedSubjects = Object.keys(gradeData || {}).filter((subject) => {
      if (selectedQuarter === 'all') {
        return ['q1', 'q2', 'q3', 'q4'].some((q) => hasChangedQuarterValue(subject, q));
      }
      return hasChangedQuarterValue(subject, selectedQuarter);
    });

    if (changedSubjects.length === 0) {
      setShowGradeModal(false);
      toast.info('No grade changes to save.');
      await fetchStudents();
      return;
    }

    // Check for unauthorized subject edits (for subject teachers including teacher role with assigned subjects)
    const isSubjectTeacherMode = (userRole === 'subject_teacher' || userRole === 'teacher') && availableSubjects.length > 0;
    if (isSubjectTeacherMode) {
      const unauthorizedSubjects = changedSubjects.filter(s => !availableSubjects.includes(s));
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
    changedSubjects.forEach(subject => {
      // For subject teachers (including teacher role with assigned subjects), only include authorized subjects
      const isSubjectTeacherMode = (userRole === 'subject_teacher' || userRole === 'teacher') && availableSubjects.length > 0;
      if (isSubjectTeacherMode && !availableSubjects.includes(subject)) {
        return;
      }
      
      if (selectedQuarter === "all") {
        const payload = {};
        ['q1', 'q2', 'q3', 'q4'].forEach((q) => {
          if (hasChangedQuarterValue(subject, q)) {
            payload[q] = gradeData[subject][q] || 0;
          }
        });
        if (Object.keys(payload).length === 0) return;
        quarterGrades[subject] = {
          ...payload,
        };
      } else {
        // Send a plain number so the backend can store it directly in the quarter column
        quarterGrades[subject] = gradeData[subject][selectedQuarter] || 0;
      }
    });

    if (Object.keys(quarterGrades).length === 0) {
      setShowGradeModal(false);
      toast.info('No grade changes to save.');
      await fetchStudents();
      return;
    }

    try {
      const response = await api.put(`/students/${selectedStudent.id}/grades`, {
        grades: quarterGrades,
        average: parseFloat(finalAverage),
        quarter: quarterValue,
        lastGradeEditTime: new Date().toISOString(),
        ...(selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {})
      });

      if (response.data?.success) {
        toast.success('Grades saved successfully! You have 24 hours to edit them again.');
        fetchStudents();
        setShowGradeModal(false);
      } else {
        setErrorMessage(`❌ Failed to save grades: ${response.data?.message || 'Unknown error'}`);
        setErrorModal(true);
      }
    } catch (apiError) {
      console.error('Error saving grades:', apiError);
      setErrorMessage(`❌ Error saving grades: ${apiError.response?.data?.message || apiError.message}`);
      setErrorModal(true);
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

  const isSubjectTeacherOnlyMode =
    userRole === 'subject_teacher' ||
    (userRole === 'teacher' && assignedSubjects.length > 0 && adviserClassIds.length === 0);
  const averageColumnLabel = isSubjectTeacherOnlyMode ? 'My Subject Average' : 'Final Average';
  const remarksColumnLabel = isSubjectTeacherOnlyMode ? 'My Remarks' : 'Remarks';

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

      {isViewOnlyMode && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg px-4 py-3 text-sm font-medium">
          View-only mode: You are viewing a past school year. Grade editing is disabled.
        </div>
      )}

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

      {/* Grading Progress */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-600">Grading Progress</p>
            <p className="text-lg font-bold text-gray-900">Quarter {progressData.quarter?.toUpperCase().replace('Q','')}</p>
            <p className="text-sm text-gray-500">Auto-updates from your assigned classes/subjects</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-extrabold text-red-700">{progressData.summary.percent || 0}%</p>
            <p className="text-sm text-gray-600">{progressData.summary.gradedStudents || 0} / {progressData.summary.totalStudents || 0} students graded</p>
          </div>
        </div>

        {progressLoading ? (
          <p className="text-sm text-gray-500">Loading progress…</p>
        ) : progressData.items.length === 0 ? (
          <p className="text-sm text-gray-500">No assigned classes found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressData.items.slice(0, 6).map((item) => (
              <div key={`${item.classId}-${item.subject}`} className="border rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">{item.grade} - {item.section}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${item.percent === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.percent}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">Subject: {item.subject}</p>
                <p className="text-xs text-gray-500 mt-1">{item.gradedStudents} / {item.totalStudents} students graded</p>
              </div>
            ))}
          </div>
        )}
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
              <option value="all">All Quarters</option>
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
                <th className="px-6 py-4 text-center">{averageColumnLabel}</th>
                <th className="px-6 py-4">{remarksColumnLabel}</th>
                <th className="px-6 py-4 text-center">Report Card</th>
              </tr>
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
                        {(() => {
                          const qAvg = selectedQuarter === 'all'
                            ? (student.live_average || student.average)
                            : student[`${selectedQuarter}_avg`];
                          return qAvg ? parseFloat(qAvg).toFixed(2) : <span className="text-gray-400 font-normal text-xs">No Grades</span>;
                        })()}
                      </td>
                      <td className="px-6 py-5">
                        {(() => {
                          const qAvg = selectedQuarter === 'all'
                            ? (student.live_average || student.average)
                            : student[`${selectedQuarter}_avg`];
                          const avg = qAvg ? parseFloat(qAvg) : 0;
                          return avg > 0 ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              avg >= 90 ? "bg-green-100 text-green-800" :
                              avg >= 85 ? "bg-blue-100 text-blue-800" :
                              avg >= 80 ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {getRemarks(avg)}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">No Grades</span>
                          );
                        })()}
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
                {(() => {
                  const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
                  // Render only the chosen quarter. Show all columns only in All Quarters mode.
                  const quartersToShow = selectedQuarter === 'all' ? quarterOrder : [selectedQuarter];
                  const isEditableQ = (q) => selectedQuarter === 'all' || q === selectedQuarter;
                  const getQLabel = (q) => q.toUpperCase();
                  const subjects = Object.keys(gradeData).filter(s => s !== 'Total Q1');
                  // Normalize subject name: strip trailing " (Grade X)" or " (Kindergarten)" for fuzzy matching
                  const normalizeSubject = (s) => s.replace(/\s*\(Grade\s+\d+\)\s*$/i, '').replace(/\s*\(Kindergarten\)\s*$/i, '').trim().toLowerCase();
                  const normalizedAvailable = availableSubjects.map(normalizeSubject);

                  const getQAvg = (q) => {
                    const vals = subjects.map(s => parseFloat(gradeData[s]?.[q])).filter(v => !isNaN(v) && v > 0);
                    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
                  };
                  const getSubjectAvg = (subject) => {
                    const vals = quarterOrder.map(q => parseFloat(gradeData[subject]?.[q])).filter(v => !isNaN(v) && v > 0);
                    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
                  };
                  const overallAvg = (() => {
                    const avgs = subjects.map(s => parseFloat(getSubjectAvg(s))).filter(v => !isNaN(v) && v > 0);
                    return avgs.length > 0 ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2) : null;
                  })();

                  return (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 border">Subject</th>
                          {quartersToShow.map(q => (
                            <th key={q} className={`px-4 py-3 text-center font-semibold border ${isEditableQ(q) ? 'text-red-700 bg-red-50' : 'text-gray-500'}`}>
                              {getQLabel(q)}
                              {isEditableQ(q) && selectedQuarter !== 'all' && <div className="text-xs font-normal text-red-400">current</div>}
                            </th>
                          ))}
                          {selectedQuarter === 'all' && <th className="px-4 py-3 text-center font-semibold text-blue-700 border bg-blue-50">Average</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((subject) => {
                          // Normalize both sides to handle "English (Grade 3)" vs "English" mismatch
                          const canEdit = availableSubjects.includes(subject) ||
                            normalizedAvailable.includes(normalizeSubject(subject));
                          return (
                            <tr key={subject} className={canEdit ? 'hover:bg-gray-50' : 'bg-gray-50'}>
                              <td className="px-4 py-3 font-medium border" style={{color: canEdit ? '#111827' : '#6b7280'}}>
                                {subject}
                                {!canEdit && (
                                  <span className="ml-2 text-xs text-gray-400 font-normal">🔒 subject teacher</span>
                                )}
                              </td>
                              {quartersToShow.map(q => {
                                const quarterClosed = isQuarterClosed(q);
                                const lockedByQuarterSelection = !isEditableQ(q);
                                const editWindowLocked = isEditWindowLocked(subject, q);
                                const editable = canEdit && !lockedByQuarterSelection && !editWindowLocked && !isGradeLocked && !isViewOnlyMode && !quarterClosed;
                                const val = gradeData[subject]?.[q];
                                const hasVal = val && val !== 0 && val !== '';
                                return (
                                  <td key={q} className="px-4 py-3 border">
                                    <div className="flex items-center justify-center gap-1">
                                      {editable ? (
                                        <>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="-"
                                            value={val || ''}
                                            onChange={(e) => handleGradeChange(subject, q, e.target.value)}
                                            className="w-16 text-center border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                          />
                                          {hasVal && (
                                            <button type="button" onClick={() => handleGradeChange(subject, q, '')}
                                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-1.5 py-1 transition text-sm font-bold" title="Clear">✕</button>
                                          )}
                                        </>
                                      ) : (
                                        <span className={`text-base font-semibold ${(quarterClosed || lockedByQuarterSelection || editWindowLocked) ? 'text-red-500' : (hasVal ? 'text-gray-700' : 'text-gray-300')}`}>
                                          {hasVal ? val : (editWindowLocked ? '24h lock' : ((quarterClosed || lockedByQuarterSelection) ? 'Closed' : '—'))}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              {selectedQuarter === 'all' && (
                                <td className="px-4 py-3 text-center border bg-blue-50">
                                  <span className="font-bold text-blue-700">{getSubjectAvg(subject) ?? '—'}</span>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 border-t-2 border-blue-300">
                          <td className="px-4 py-4 text-right font-bold text-gray-900 border">
                            {selectedQuarter === 'all' ? 'Overall Average:' : `Total ${getQLabel(selectedQuarter)} Grade:`}
                          </td>
                          {quartersToShow.map(q => (
                            <td key={q} className="px-4 py-4 text-center font-bold border">
                              {isEditableQ(q) ? (
                                <span className="text-2xl text-blue-700">{getQAvg(q) ?? '—'}</span>
                              ) : (
                                <span className="text-base text-gray-500">{getQAvg(q) ?? '—'}</span>
                              )}
                            </td>
                          ))}
                          {selectedQuarter === 'all' && (
                            <td className="px-4 py-4 text-center border bg-blue-100">
                              <span className="text-2xl font-bold text-blue-700">{overallAvg ?? '—'}</span>
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={saveGrades}
                  disabled={isGradeLocked || isViewOnlyMode}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition shadow-lg ${
                    (isGradeLocked || isViewOnlyMode)
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Save Grades
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
              ? ((reportCardStudent[0]?.gradeLevel || reportCardStudent[0]?.grade_level) || selectedGradeLevel)
              : (reportCardStudent ? (reportCardStudent.gradeLevel || reportCardStudent.grade_level) : (selectedGradeLevel === "All Grades" ? "All Grades" : selectedGradeLevel))
          }
          section={
            Array.isArray(reportCardStudent)
              ? ((reportCardStudent[0]?.section || reportCardStudent[0]?.Section) || selectedSection)
              : (reportCardStudent ? (reportCardStudent.section || reportCardStudent.Section) : selectedSection)
          }
          classId={
            Array.isArray(reportCardStudent)
              ? (reportCardStudent[0]
                ? `${((reportCardStudent[0].gradeLevel || reportCardStudent[0].grade_level) || '').toLowerCase().replace(/\s+/g, '-')}-${((reportCardStudent[0].section || reportCardStudent[0].Section) || '').toLowerCase().replace(/\s+/g, '-')}`
                : null)
              : (reportCardStudent
                ? `${((reportCardStudent.gradeLevel || reportCardStudent.grade_level) || '').toLowerCase().replace(/\s+/g, '-')}-${((reportCardStudent.section || reportCardStudent.Section) || '').toLowerCase().replace(/\s+/g, '-')}`
                : (selectedGradeLevel !== "All Grades" && selectedSection !== "All Sections"
                  ? `${selectedGradeLevel.toLowerCase().replace(/\s+/g, '-')}-${selectedSection.toLowerCase().replace(/\s+/g, '-')}`
                  : null))
          }
          schoolYearId={selectedSchoolYearId || activeSchoolYearId || undefined}
          onClose={() => { setShowReportCard(false); setReportCardStudent(null); }}
        />
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">Error!</h3>
            <p className="text-gray-600 text-center mb-6">{errorMessage}</p>
            <button
              onClick={() => setErrorModal(false)}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}