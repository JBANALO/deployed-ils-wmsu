import React, { useState, useEffect } from "react";
import { ClipboardDocumentIcon, PencilSquareIcon, MagnifyingGlassIcon, EyeIcon, XMarkIcon, PrinterIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import { toast } from 'react-toastify';
import { useSchoolYear } from "../../context/SchoolYearContext";
import AdminForm137Print from "../../components/admin/AdminForm137Print";

const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4'];
const QUARTER_LABELS = {
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4'
};
const TOP_PERFORMER_MIN_GRADE = 90;
const TOP_PERFORMER_LIMIT_PER_GRADE = 5;
const RANKING_MIN_GRADE = 90;

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

const getStudentGradeLevel = (student) => student?.gradeLevel || student?.grade_level || '';
const dedupeSubjects = (values = []) => {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = normalizeSubjectName(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(String(value).trim());
  });
  return result;
};

export default function AdminGrades() {
  const { viewingSchoolYear, activeSchoolYear, isViewingLocked } = useSchoolYear();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('All');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [topPerformersByGrade, setTopPerformersByGrade] = useState([]);
  const [rankingBasis, setRankingBasis] = useState('final');
  const [activeTab, setActiveTab] = useState('students');
  const [computationMode, setComputationMode] = useState('deped');
  const [selectedComputationGradeLevel, setSelectedComputationGradeLevel] = useState('');
  const [computationSubjects, setComputationSubjects] = useState([]);
  const [newComputationSubject, setNewComputationSubject] = useState('');
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState({});
  const [editGrades, setEditGrades] = useState({});
  const [selectedQuarter, setSelectedQuarter] = useState('q1');
  const [saving, setSaving] = useState(false);
  const [subjectsByGrade, setSubjectsByGrade] = useState({});
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [showForm137Modal, setShowForm137Modal] = useState(false);
  const [form137Records, setForm137Records] = useState([]);
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [gradeStatuses, setGradeStatuses] = useState({});
  const [selectedSection, setSelectedSection] = useState('All');
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [unlockRequestsLoading, setUnlockRequestsLoading] = useState(false);
  const targetSchoolYearId = viewingSchoolYear?.id || activeSchoolYear?.id || '';
  const rankingLabelMap = {
    final: 'Final Average',
    q1: 'Q1 Average',
    q2: 'Q2 Average',
    q3: 'Q3 Average',
    q4: 'Q4 Average'
  };

  const getComputationSettingsStorageKey = (schoolYearId, gradeLevel) =>
    `adminGradeComputationSettings:${String(schoolYearId || 'default')}:${String(gradeLevel || 'all')}`;

  const buildDefaultComputationSubjects = () => {
    if (!selectedComputationGradeLevel) return [];
    const gradeSubjects = dedupeSubjects([
      ...(subjectsByGrade[selectedComputationGradeLevel] || []),
      ...(DEPED_SUBJECTS[selectedComputationGradeLevel] || [])
    ]);

    return gradeSubjects.map((name) => ({
      name,
      included: true,
      weight: 0
    }));
  };

  const loadComputationSettings = () => {
    if (!selectedComputationGradeLevel) return;

    const defaults = buildDefaultComputationSubjects();
    const key = getComputationSettingsStorageKey(targetSchoolYearId, selectedComputationGradeLevel);

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setComputationMode('deped');
        setComputationSubjects(defaults);
        return;
      }

      const parsed = JSON.parse(raw);
      const mode = parsed?.mode === 'custom' ? 'custom' : 'deped';
      const savedSubjects = Array.isArray(parsed?.subjects) ? parsed.subjects : [];
      const merged = dedupeSubjects([
        ...defaults.map((item) => item.name),
        ...savedSubjects.map((item) => item?.name)
      ]).map((name) => {
        const saved = savedSubjects.find(
          (item) => normalizeSubjectName(item?.name) === normalizeSubjectName(name)
        );
        return {
          name,
          included: saved ? Boolean(saved.included) : true,
          weight: saved && Number.isFinite(Number(saved.weight)) ? Number(saved.weight) : 0
        };
      });

      setComputationMode(mode);
      setComputationSubjects(merged);
    } catch (error) {
      console.warn('Failed to parse admin computation settings. Falling back to defaults.', error);
      setComputationMode('deped');
      setComputationSubjects(defaults);
    }
  };



  useEffect(() => {
    loadGradesData();
  }, [targetSchoolYearId, rankingBasis]);

  const computationGradeLevelOptions = dedupeSubjects([
    ...gradeLevels,
    ...Object.keys(subjectsByGrade || {}),
    ...Object.keys(DEPED_SUBJECTS)
  ]);

  useEffect(() => {
    if (computationGradeLevelOptions.length === 0) return;
    if (!selectedComputationGradeLevel || !computationGradeLevelOptions.includes(selectedComputationGradeLevel)) {
      const preferred = selectedGradeLevel !== 'All' && computationGradeLevelOptions.includes(selectedGradeLevel)
        ? selectedGradeLevel
        : computationGradeLevelOptions[0];
      setSelectedComputationGradeLevel(preferred);
    }
  }, [computationGradeLevelOptions, selectedComputationGradeLevel, selectedGradeLevel]);

  useEffect(() => {
    loadComputationSettings();
  }, [targetSchoolYearId, selectedComputationGradeLevel]);

  // Merge newly discovered grade subjects without wiping unsaved manual additions.
  useEffect(() => {
    if (!selectedComputationGradeLevel) return;
    const defaults = buildDefaultComputationSubjects();
    if (!Array.isArray(defaults) || defaults.length === 0) return;

    setComputationSubjects((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return defaults;
      }

      const existing = new Set(prev.map((item) => normalizeSubjectName(item?.name)));
      const additions = defaults.filter((item) => !existing.has(normalizeSubjectName(item?.name)));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  }, [selectedComputationGradeLevel, subjectsByGrade]);

  const findComputationSubjectConfig = (subjectName) => {
    return computationSubjects.find(
      (item) => normalizeSubjectName(item?.name) === normalizeSubjectName(subjectName)
    ) || null;
  };

  const handleToggleComputationSubject = (subjectName) => {
    setComputationSubjects((prev) =>
      prev.map((item) =>
        item.name === subjectName
          ? { ...item, included: !item.included }
          : item
      )
    );
  };

  const handleComputationWeightChange = (subjectName, rawValue) => {
    const nextWeight = Number(rawValue);
    setComputationSubjects((prev) =>
      prev.map((item) => {
        if (item.name !== subjectName) return item;
        return {
          ...item,
          weight: Number.isFinite(nextWeight) && nextWeight >= 0 ? nextWeight : 0
        };
      })
    );
  };

  const handleAddComputationSubject = () => {
    if (!selectedComputationGradeLevel) {
      toast.error('Select a grade level first.');
      return;
    }

    const cleanName = String(newComputationSubject || '').trim();
    if (!cleanName) return;

    const exists = computationSubjects.some(
      (item) => normalizeSubjectName(item?.name) === normalizeSubjectName(cleanName)
    );
    if (exists) {
      toast.info('Subject already exists for this grade level.');
      return;
    }

    setComputationSubjects((prev) => [
      ...prev,
      {
        name: cleanName,
        included: true,
        weight: 0
      }
    ]);
    setNewComputationSubject('');
    toast.success(`Added subject: ${cleanName}`);
  };

  const handleDeleteComputationSubject = (subjectName) => {
    setComputationSubjects((prev) => prev.filter((item) => item.name !== subjectName));
  };

  const saveComputationSettings = () => {
    if (!selectedComputationGradeLevel) {
      toast.error('Select a grade level first.');
      return;
    }

    const key = getComputationSettingsStorageKey(targetSchoolYearId, selectedComputationGradeLevel);
    localStorage.setItem(
      key,
      JSON.stringify({
        mode: computationMode,
        subjects: computationSubjects
      })
    );
    toast.success('Admin grade computation settings saved.');
  };

  const resetComputationSettings = () => {
    if (!selectedComputationGradeLevel) {
      toast.error('Select a grade level first.');
      return;
    }

    const key = getComputationSettingsStorageKey(targetSchoolYearId, selectedComputationGradeLevel);
    localStorage.removeItem(key);
    setComputationMode('deped');
    setComputationSubjects(buildDefaultComputationSubjects());
    toast.info('Admin grade computation settings reset to default.');
  };

  const computeConfiguredAverage = (gradesMap) => {
    let subjects = Object.keys(gradesMap || {});
    if (computationSubjects.length > 0) {
      subjects = subjects.filter((subject) => {
        const config = findComputationSubjectConfig(subject);
        return Boolean(config?.included);
      });
    }

    if (subjects.length === 0) return 0;

    const getSubjectScore = (subject) => {
      if (selectedQuarter === 'all') {
        const values = QUARTER_KEYS
          .map((q) => Number(gradesMap?.[subject]?.[q] || 0))
          .filter((value) => value > 0);
        if (values.length === 0) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      }
      return Number(gradesMap?.[subject]?.[selectedQuarter] || 0);
    };

    if (computationMode === 'custom') {
      let weightedTotal = 0;
      let appliedWeight = 0;

      subjects.forEach((subject) => {
        const score = getSubjectScore(subject);
        if (score <= 0) return;

        const config = findComputationSubjectConfig(subject);
        const weight = Number(config?.weight) || 0;
        if (weight <= 0) return;

        weightedTotal += score * (weight / 100);
        appliedWeight += weight;
      });

      if (appliedWeight <= 0) return 0;
      return Number((((weightedTotal * 100) / appliedWeight).toFixed(2)));
    }

    const scores = subjects
      .map((subject) => getSubjectScore(subject))
      .filter((value) => value > 0);
    if (scores.length === 0) return 0;

    return Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2));
  };

  const loadGradesData = async () => {
    try {
      setLoading(true);

      // Fetch ALL students (with and without grades)
      const studentsRes = await axios.get('/students', {
        params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
      });
      const studentsData = Array.isArray(studentsRes.data.data) ? studentsRes.data.data : 
                           Array.isArray(studentsRes.data) ? studentsRes.data : [];

      const getRankingValue = (student) => {
        switch (rankingBasis) {
          case 'q1':
            return Number(student?.q1_avg || 0);
          case 'q2':
            return Number(student?.q2_avg || 0);
          case 'q3':
            return Number(student?.q3_avg || 0);
          case 'q4':
            return Number(student?.q4_avg || 0);
          case 'final':
          default:
            return Number(student?.average || student?.live_average || 0);
        }
      };

      const studentsWithRankingValue = studentsData.map((student) => ({
        ...student,
        rankingValue: getRankingValue(student)
      }));

      const isRankingQualified = (student) => Number(student?.rankingValue || 0) >= RANKING_MIN_GRADE;

      // Rank by selected basis (Final/Q1/Q2/Q3/Q4).
      // Only students at 90+ are ranked; everyone else stays unranked.
      const sortedStudents = studentsWithRankingValue
        .filter((student) => isRankingQualified(student))
        .sort((a, b) => (b.rankingValue || 0) - (a.rankingValue || 0))
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));

      // Include non-qualified students at the end as unranked.
      const studentsWithoutGrades = studentsWithRankingValue
        .filter((student) => !isRankingQualified(student))
        .map(student => ({ ...student, rank: '-' }));

      // Combine: students with grades first, then students without
      const allStudents = [...sortedStudents, ...studentsWithoutGrades];
      setStudents(allStudents);

      // Fetch draft/posted status for all students
      try {
        const statusRes = await axios.get('/students/grade-publish-statuses', {
          params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
        });
        if (statusRes.data?.success) setGradeStatuses(statusRes.data.data || {});
      } catch (e) { console.warn('Could not fetch grade statuses:', e.message); }

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
      const sortedGradeLevels = uniqueGradeLevels.sort((a, b) => {
        const gradeA = parseInt(String(a).replace(/\D/g, ''), 10);
        const gradeB = parseInt(String(b).replace(/\D/g, ''), 10);
        return (Number.isNaN(gradeA) ? 0 : gradeA) - (Number.isNaN(gradeB) ? 0 : gradeB);
      });
      setGradeLevels(sortedGradeLevels);

      // Top performers: 95+ only, max 5 students per grade level.
      const groupedTopPerformers = sortedGradeLevels
        .map((gradeLabel) => {
          const topStudents = studentsWithRankingValue
            .filter((student) =>
              String(student.gradeLevel || '').trim() === String(gradeLabel || '').trim() &&
              Number(student.rankingValue || 0) >= TOP_PERFORMER_MIN_GRADE
            )
            .sort((a, b) => Number(b.rankingValue || 0) - Number(a.rankingValue || 0))
            .slice(0, TOP_PERFORMER_LIMIT_PER_GRADE)
            .map((student, index) => ({
              rankInGrade: index + 1,
              name: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
              metricLabel: rankingLabelMap[rankingBasis] || 'Final Average',
              grade: Number(student.rankingValue || 0)
            }));

          return {
            gradeLevel: gradeLabel,
            students: topStudents
          };
        })
        .filter((group) => group.students.length > 0);

      setTopPerformersByGrade(groupedTopPerformers);

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
      const response = await axios.get(`/students/${student.id}/grades`, {
        params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
      });
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
    const grade = getStudentGradeLevel(student);
    return subjectsByGrade[grade] || DEPED_SUBJECTS[grade] || DEPED_SUBJECTS['Grade 1'];
  };

  const fetchSubjectsForStudent = async (student, grades = {}) => {
    const grade = getStudentGradeLevel(student);
    let gradeSubjects = [];

    try {
      // Keep same subject source logic as teacher grade flow.
      const gradeKey = String(grade).replace(/^Grade\s+/i, '').trim();
      if (gradeKey) {
        const params = targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {};
        const res = await axios.get(`/subjects/grade/${encodeURIComponent(gradeKey)}`, { params });
        gradeSubjects = (res.data?.data || []).map((s) => s.name).filter(Boolean);
      }
    } catch (error) {
      console.warn('Could not fetch fresh subjects for print:', grade, error?.message || error);
    }

    const fallbackSubjects = gradeSubjects.length > 0
      ? gradeSubjects
      : getSubjectsForStudent(student);

    const merged = [...fallbackSubjects];
    const existingNormalized = new Set(merged.map(normalizeSubjectName));
    Object.keys(grades || {}).forEach((subjectKey) => {
      const norm = normalizeSubjectName(subjectKey);
      if (!existingNormalized.has(norm)) {
        merged.push(subjectKey);
        existingNormalized.add(norm);
      }
    });

    return merged;
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
      initialGrades[subject] = {
        q1: Number(matchedGrade.q1 || 0),
        q2: Number(matchedGrade.q2 || 0),
        q3: Number(matchedGrade.q3 || 0),
        q4: Number(matchedGrade.q4 || 0)
      };
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
      // Build payload depending on selected quarter.
      const payloadGrades = {};
      Object.entries(editGrades).forEach(([subject, values]) => {
        if (selectedQuarter === 'all') {
          payloadGrades[subject] = {
            q1: Number(values?.q1 || 0),
            q2: Number(values?.q2 || 0),
            q3: Number(values?.q3 || 0),
            q4: Number(values?.q4 || 0)
          };
        } else {
          payloadGrades[subject] = Number(values?.[selectedQuarter] || 0);
        }
      });

      // Calculate average using active computation settings (DepEd or custom weights).
      const average = computeConfiguredAverage(editGrades);

      const response = await axios.put(`/students/${selectedStudent.id}/grades`, {
        grades: payloadGrades,
        quarter: selectedQuarter,
        average: average.toFixed(2)
      });

      if (response.data.success) {
        toast.success(selectedQuarter === 'all' ? 'Grades saved for ALL QUARTERS' : `Grades saved for ${selectedQuarter.toUpperCase()}`);
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
  const handleGradeChange = (subject, quarter, value) => {
    const numValue = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setEditGrades(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [quarter]: numValue
      }
    }));
  };

  // Filter students
  const availableSections = ['All', ...new Set(students
    .filter(s => selectedGradeLevel === 'All' || s.gradeLevel === selectedGradeLevel)
    .map(s => s.section).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));

  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchQuery || 
      student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lrn?.includes(searchQuery);

    const matchesGradeLevel = selectedGradeLevel === 'All' || 
      student.gradeLevel === selectedGradeLevel;

    const matchesSection = selectedSection === 'All' ||
      student.section === selectedSection;

    return matchesSearch && matchesGradeLevel && matchesSection;
  });

  const fetchUnlockRequests = async () => {
    setUnlockRequestsLoading(true);
    try {
      const res = await axios.get('/students/grade-unlock-requests', {
        params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
      });
      setUnlockRequests(res.data?.data || []);
    } catch (e) { console.warn('Could not fetch unlock requests:', e.message); }
    finally { setUnlockRequestsLoading(false); }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await axios.put(`/students/grade-unlock-requests/${requestId}/approve`);
      toast.success('Unlock request approved. Teacher can now edit grades.');
      fetchUnlockRequests();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to approve'); }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axios.put(`/students/grade-unlock-requests/${requestId}/reject`);
      toast.info('Unlock request rejected.');
      fetchUnlockRequests();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to reject'); }
  };

  const includedComputationSubjects = computationSubjects.filter((item) => item?.included);
  const includedSubjectCount = includedComputationSubjects.length;
  const equalDepedWeight = includedSubjectCount > 0 ? (100 / includedSubjectCount) : 0;
  const displayedTotalWeight = computationMode === 'deped'
    ? (includedSubjectCount > 0 ? 100 : 0)
    : includedComputationSubjects.reduce((sum, item) => {
        const weight = Number(item?.weight);
        return sum + (Number.isFinite(weight) ? weight : 0);
      }, 0);
  const activeFormulaText = computationMode === 'deped'
    ? `Final Average = Σ(subject final grades) / ${includedSubjectCount || 'n'}`
    : 'Final Average = Σ(subject grade × weight%)';

  const schoolYearLabel = viewingSchoolYear?.label || activeSchoolYear?.label || '';

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const ids = filteredStudents.map((s) => s.id).filter(Boolean);
    const allSelected = ids.length > 0 && ids.every((id) => selectedStudentIds.has(id));
    if (allSelected) {
      setSelectedStudentIds(new Set());
      return;
    }
    setSelectedStudentIds(new Set(ids));
  };

  const prepareForm137Print = async (studentsToPrint) => {
    if (!Array.isArray(studentsToPrint) || studentsToPrint.length === 0) {
      toast.info('No students selected to print.');
      return;
    }

    setPreparingPrint(true);
    try {
      const records = await Promise.all(studentsToPrint.map(async (student) => {
        const grades = await fetchStudentGrades(student);
        const subjects = await fetchSubjectsForStudent(student, grades);
        return {
          student,
          grades,
          subjects,
        };
      }));

      setForm137Records(records);
      setShowForm137Modal(true);
    } catch (error) {
      console.error('Error preparing Form 137 print:', error);
      toast.error('Failed to prepare Form 137 print data');
    } finally {
      setPreparingPrint(false);
    }
  };

  const handlePrintAll = () => prepareForm137Print(filteredStudents);

  const handlePrintSelected = () => {
    const chosen = filteredStudents.filter((student) => selectedStudentIds.has(student.id));
    prepareForm137Print(chosen);
  };

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

        ) : topPerformersByGrade.length === 0 ? (

          <p className="text-gray-500">No students with {TOP_PERFORMER_MIN_GRADE}+ grades found.</p>

        ) : (

          <div className="space-y-3">
            {topPerformersByGrade.map((group) => (
              <div key={group.gradeLevel}>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {group.gradeLevel} - Top {TOP_PERFORMER_LIMIT_PER_GRADE} ({TOP_PERFORMER_MIN_GRADE}+)
                </p>
                <ul className="text-gray-700 text-sm list-disc ml-5 space-y-1">
                  {group.students.map((student) => (
                    <li key={`${group.gradeLevel}-${student.rankInGrade}-${student.name}`}>
                      <span className="font-semibold">#{student.rankInGrade} {student.name}</span>
                      {' '}— {student.metricLabel}: <span className="text-green-700 font-bold">{student.grade}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        )}

      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 px-6 pt-4">
        <div className="flex items-center gap-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`pb-3 text-xl font-semibold transition ${
              activeTab === 'students'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            All Students Grades
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('computation')}
            className={`pb-3 text-xl font-semibold transition ${
              activeTab === 'computation'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Grade Computation Settings
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('unlockRequests'); fetchUnlockRequests(); }}
            className={`pb-3 text-xl font-semibold transition ${
              activeTab === 'unlockRequests'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Unlock Requests
            {unlockRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                {unlockRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'students' ? (
      <div className="bg-white shadow rounded-lg border border-gray-200 mt-6">

        <div className="flex justify-between items-center p-4 border-b flex-wrap gap-4">

          <h3 className="text-lg font-semibold text-gray-800">All Students Grades</h3>

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={handlePrintSelected}
              disabled={selectedStudentIds.size === 0 || preparingPrint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print Form 137 for selected students"
            >
              <PrinterIcon className="w-5 h-5" />
              Print Selected ({selectedStudentIds.size})
            </button>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={filteredStudents.length === 0 || preparingPrint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print Form 137 for all filtered students"
            >
              <PrinterIcon className="w-5 h-5" />
              Print All ({filteredStudents.length})
            </button>

            <select

              value={rankingBasis}

              onChange={(e) => setRankingBasis(e.target.value)}

              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-800"

            >

              <option value="final">Rank: Final Average</option>
              <option value="q1">Rank: Q1 Average</option>
              <option value="q2">Rank: Q2 Average</option>
              <option value="q3">Rank: Q3 Average</option>
              <option value="q4">Rank: Q4 Average</option>

            </select>

            <select

              value={selectedGradeLevel}

              onChange={(e) => { setSelectedGradeLevel(e.target.value); setSelectedSection('All'); }}

              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-800"

            >

              <option value="All">All Grade Levels</option>

              {gradeLevels.map((gradeLevel) => (

                <option key={gradeLevel} value={gradeLevel}>{gradeLevel}</option>

              ))}

            </select>

            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-800"
            >
              {availableSections.map(sec => (
                <option key={sec} value={sec}>{sec === 'All' ? 'All Sections' : sec}</option>
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

                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.has(s.id))}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Select all students"
                  />
                </th>

                <th className="p-4">LRN</th>

                <th className="p-4">Student Name</th>

                <th className="p-4">Section</th>

                <th className="p-4">Final Average</th>

                <th className="p-4">Rank ({rankingLabelMap[rankingBasis] || 'Final Average'})</th>

                <th className="p-4 text-center">Status</th>

                <th className="p-4 text-center">Actions</th>

              </tr>

            </thead>



            <tbody>

              {loading ? (

                <tr>

                  <td colSpan="8" className="p-4 text-center text-gray-500">Loading grades data...</td>

                </tr>

              ) : filteredStudents.length === 0 ? (

                <tr>

                  <td colSpan="8" className="p-4 text-center text-gray-500">No students found</td>

                </tr>

              ) : (

                filteredStudents.map((student, index) => (

                  <tr key={student.id || index} className="border-b hover:bg-gray-50">

                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        aria-label={`Select ${student.fullName || `${student.firstName || ''} ${student.lastName || ''}`}`}
                      />
                    </td>

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

                    <td className="p-4 text-center">
                      {(() => {
                        const st = gradeStatuses[String(student.id)];
                        if (st === 'posted') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Posted</span>;
                        if (st === 'draft') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Draft</span>;
                        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">—</span>;
                      })()}
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
          Showing {filteredStudents.length} of {students.length} students • Selected: {selectedStudentIds.size}
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="block text-lg font-semibold text-gray-700 mb-2">GRADE LEVEL</label>
              <select
                value={selectedComputationGradeLevel}
                onChange={(e) => setSelectedComputationGradeLevel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xl font-semibold"
              >
                {computationGradeLevelOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              <p className="text-base text-gray-500 mt-2">Subjects below are managed per selected grade level.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">AVERAGE COMPUTATION METHOD</h3>
            </div>

            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={computationMode === 'custom'}
                onClick={() => setComputationMode((prev) => (prev === 'custom' ? 'deped' : 'custom'))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  computationMode === 'custom' ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    computationMode === 'custom' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <div>
                <p className="text-2xl font-semibold text-gray-900">Custom weights (editable)</p>
                <p className="text-base text-gray-500 mt-1">
                  {computationMode === 'deped'
                    ? 'DepEd standard mode is active: equal weight across included subjects.'
                    : 'Custom mode is active: weights are editable per included subject.'}
                </p>
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
              <p className="text-lg font-semibold text-gray-700 mb-2">Active formula</p>
              <code className="block text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {activeFormulaText}
              </code>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-lg font-semibold text-gray-700">School Year: {schoolYearLabel || 'N/A'}</p>
              <p className="text-base text-gray-500 mt-2">Computation settings are saved per school year + grade level.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">SUBJECTS IN AVERAGE (N = {includedSubjectCount})</h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {computationSubjects.map((subject) => {
                const displayedWeight = computationMode === 'deped'
                  ? (subject.included ? equalDepedWeight : 0)
                  : (subject.included ? (Number(subject.weight) || 0) : 0);

                return (
                  <div key={subject.name} className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <input
                      type="checkbox"
                      checked={Boolean(subject.included)}
                      onChange={() => handleToggleComputationSubject(subject.name)}
                      className="w-5 h-5"
                    />
                    <span className="flex-1 text-xl text-gray-900">{subject.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={Number.isFinite(displayedWeight) ? displayedWeight.toFixed(1) : '0.0'}
                      onChange={(e) => handleComputationWeightChange(subject.name, e.target.value)}
                      disabled={computationMode === 'deped' || !subject.included}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right text-xl disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <span className="text-lg text-gray-500">%</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteComputationSubject(subject.name)}
                      className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      title="Delete subject"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-2xl text-gray-700">Total weight</p>
              <p className={`text-3xl font-bold ${
                computationMode === 'deped' || Math.abs(displayedTotalWeight - 100) < 0.01
                  ? 'text-green-700'
                  : 'text-orange-600'
              }`}>
                {displayedTotalWeight.toFixed(1)}%
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newComputationSubject}
                onChange={(e) => setNewComputationSubject(e.target.value)}
                placeholder="New subject name"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-base"
              />
              <button
                type="button"
                onClick={handleAddComputationSubject}
                className="px-5 py-3 border border-gray-300 rounded-xl text-2xl font-semibold hover:bg-gray-50"
              >
                + Add subject
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetComputationSettings}
                className="px-6 py-3 border border-gray-300 rounded-xl text-lg font-semibold hover:bg-gray-50"
              >
                Reset to default
              </button>
              <button
                type="button"
                onClick={saveComputationSettings}
                className="px-6 py-3 bg-red-700 text-white rounded-xl text-lg font-semibold hover:bg-red-800"
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'unlockRequests' && (
        <div className="bg-white shadow rounded-lg border border-gray-200 mt-6">
          <div className="flex justify-between items-center p-4 border-b flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Unlock Requests</h3>
            <button
              type="button"
              onClick={fetchUnlockRequests}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Refresh
            </button>
          </div>
          {unlockRequestsLoading ? (
            <p className="p-6 text-gray-500 text-center">Loading...</p>
          ) : unlockRequests.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No unlock requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4">Teacher</th>
                    <th className="p-4">Student</th>
                    <th className="p-4">Section</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Requested At</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unlockRequests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{req.teacher_name || req.performed_by_name || 'Unknown'}</td>
                      <td className="p-4">{req.student_name || `Student #${req.student_id}`}</td>
                      <td className="p-4">{req.section || '—'}</td>
                      <td className="p-4 max-w-xs text-sm text-gray-600">{req.reason || '—'}</td>
                      <td className="p-4 text-sm text-gray-500">{req.created_at ? new Date(req.created_at).toLocaleString() : '—'}</td>
                      <td className="p-4 text-center">
                        {req.status === 'pending' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Approved</span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {req.status === 'pending' && (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {req.status !== 'pending' && (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm137Modal && (
        <AdminForm137Print
          records={form137Records}
          schoolYearLabel={schoolYearLabel}
          onClose={() => setShowForm137Modal(false)}
        />
      )}

      {/* View Grades Modal */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
                  <option value="all">All Quarters</option>
                </select>
              </div>

              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Subject</th>
                    {selectedQuarter === 'all' ? (
                      <>
                        <th className="border p-2 text-center">Q1 (Current / New)</th>
                        <th className="border p-2 text-center">Q2 (Current / New)</th>
                        <th className="border p-2 text-center">Q3 (Current / New)</th>
                        <th className="border p-2 text-center">Q4 (Current / New)</th>
                      </>
                    ) : (
                      <>
                        <th className="border p-2 text-center">Current Grade</th>
                        <th className="border p-2 text-center">New Grade ({selectedQuarter.toUpperCase()})</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getSubjectsForStudent(selectedStudent).map(subject => {
                    const matched = getMatchedGrade(studentGrades, subject);
                    return (
                      <tr key={subject}>
                        <td className="border p-2">{subject}</td>
                        {selectedQuarter === 'all' ? (
                          QUARTER_KEYS.map((qKey) => {
                            const currentGrade = matched?.[qKey] || '-';
                            return (
                              <td key={`${subject}-${qKey}`} className="border p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-xs text-gray-500 w-8 text-right">{currentGrade}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editGrades?.[subject]?.[qKey] || ''}
                                    onChange={(e) => handleGradeChange(subject, qKey, e.target.value)}
                                    className="border rounded px-2 py-1 w-20 text-center"
                                    placeholder={QUARTER_LABELS[qKey]}
                                  />
                                </div>
                              </td>
                            );
                          })
                        ) : (
                          <>
                            <td className="border p-2 text-center">{matched?.[selectedQuarter] || '-'}</td>
                            <td className="border p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editGrades?.[subject]?.[selectedQuarter] || ''}
                                onChange={(e) => handleGradeChange(subject, selectedQuarter, e.target.value)}
                                className="border rounded px-2 py-1 w-20 text-center"
                                placeholder="0-100"
                              />
                            </td>
                          </>
                        )}
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

