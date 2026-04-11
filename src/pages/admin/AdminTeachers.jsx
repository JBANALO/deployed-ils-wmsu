import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  UserGroupIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  PencilSquareIcon, 
  EyeIcon, 
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  UsersIcon,
  KeyIcon,
  XMarkIcon,
  LockClosedIcon
} from "@heroicons/react/24/solid";
import { API_BASE_URL } from "../../api/config";
import api from "../../api/axiosConfig";
import { toast } from 'react-toastify';
import { useSchoolYear } from "../../context/SchoolYearContext";
import RestoreTeacherModal from '../../components/modals/RestoreTeacherModal';
import PermanentDeleteTeacherModal from '../../components/modals/PermanentDeleteTeacherModal';
import TeacherBulkImportModal from "../../components/modals/TeacherBulkImportModal";
import { generateWmsuPassword } from "../../utils/passwordGenerator";

const API_BASE = import.meta.env.VITE_API_URL;

export default function AdminTeachers() {
  const navigate = useNavigate();
  const { viewingSchoolYear, setViewingSchoolYear, setActiveSchoolYear: setContextActiveSchoolYear, isViewingLocked } = useSchoolYear();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [archivedTeachers, setArchivedTeachers] = useState([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [teacherToRestore, setTeacherToRestore] = useState(null);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [teacherToPermanentDelete, setTeacherToPermanentDelete] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [selectedAdvisers, setSelectedAdvisers] = useState(new Set());
  const [selectedSubjectTeachers, setSelectedSubjectTeachers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllAdvisers, setSelectAllAdvisers] = useState(false);
  const [selectAllSubjectTeachers, setSelectAllSubjectTeachers] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [selectedArchivedTeachers, setSelectedArchivedTeachers] = useState(new Set());
  const [selectAllArchived, setSelectAllArchived] = useState(false);
  const [prevTeachers, setPrevTeachers] = useState([]);
  const [selectedPrevTeacherIds, setSelectedPrevTeacherIds] = useState(new Set());
  const [fetchPrevLoading, setFetchPrevLoading] = useState(false);
  const [fetchPrevSubmitting, setFetchPrevSubmitting] = useState(false);

  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);

  // Subjects by grade level (Official DepEd K-12 Curriculum)
  const subjectsByGradeLevel = {
    "Kindergarten": ["Mother Tongue", "Filipino", "English", "Mathematics", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 1": ["Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 2": ["Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 3": ["Mother Tongue", "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "Music", "Arts", "Physical Education", "Health"],
    "Grade 4": ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "EPP", "Music", "Arts", "Physical Education", "Health"],
    "Grade 5": ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "EPP", "Music", "Arts", "Physical Education", "Health"],
    "Grade 6": ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "EPP", "Music", "Arts", "Physical Education", "Health"]
  };

  const normalizeTeacherRole = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

  const normalizeTeacherStatus = (teacher) => {
    const rawStatus = teacher?.status ?? teacher?.verification_status ?? teacher?.approval_status ?? 'approved';
    return String(rawStatus).trim().toLowerCase();
  };

  const isAssignmentOnlyTeacher = (teacher) => String(teacher?.id || '').trim().startsWith('assignment-');

  const isVisibleTeacherStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized !== 'declined' && normalized !== 'rejected';
  };

  const matchesStatusFilter = (status, filter) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'inactive') return normalized === 'inactive';
    if (filter === 'pending') return normalized === 'pending';
    if (filter === 'active') return normalized === 'approved' || normalized === 'active' || normalized === 'pending';
    return true;
  };

  const normalizeTeacherRecord = (teacher) => ({
    ...teacher,
    firstName: teacher.firstName || teacher.first_name || '',
    lastName: teacher.lastName || teacher.last_name || '',
    email: teacher.email || '',
    sex: teacher.sex || '',
    contactNumber: teacher.contactNumber || teacher.contact_number || '',
    role: normalizeTeacherRole(teacher.role || teacher.position || teacher.role_in_class),
    status: normalizeTeacherStatus(teacher),
    classSections: Array.isArray(teacher.classSections)
      ? teacher.classSections
      : Array.isArray(teacher.class_sections)
        ? teacher.class_sections
        : []
  });

  const fetchSchoolYears = async () => {
    try {
      const res = await api.get('/school-years');
      const list = res.data?.data || res.data || [];
      setSchoolYears(Array.isArray(list) ? list : []);
      const active = Array.isArray(list) ? list.find((sy) => sy.is_active) : null;
      if (active) {
        setActiveSchoolYear(active);
        setContextActiveSchoolYear(active);
        if (viewingSchoolYear?.id) {
          setSelectedSchoolYearId(String(viewingSchoolYear.id));
        } else if (!selectedSchoolYearId) {
          setSelectedSchoolYearId(String(active.id));
          setViewingSchoolYear(active);
        }
      }
    } catch (error) {
      console.error('Failed to load school years:', error);
      toast.error('Failed to load school years');
    }
  };

  // Handle select all subjects
  const handleSelectAllSubjects = () => {
    const availableSubjects = subjectsByGradeLevel[editFormData.gradeLevel] || [];
    if (editFormData.subjects?.length === availableSubjects.length) {
      // Deselect all
      setEditFormData({...editFormData, subjects: []});
    } else {
      // Select all
      setEditFormData({...editFormData, subjects: availableSubjects});
    }
  };

  useEffect(() => {
    fetchSchoolYears();
  }, []);

  // Sync with context school year selection
  useEffect(() => {
    if (viewingSchoolYear?.id) {
      setSelectedSchoolYearId(String(viewingSchoolYear.id));
    }
  }, [viewingSchoolYear?.id]);

  useEffect(() => {
    if (selectedSchoolYearId) {
      fetchTeachers();
    }
  }, [selectedSchoolYearId]);

  useEffect(() => {
    if (!selectedSchoolYearId) return;

    const interval = setInterval(() => {
      fetchTeachers(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedSchoolYearId]);

  // Helper function to fix mixed up grade level and section data
  const fixGradeAndSection = (teacher) => {
    const gradeLevel = teacher.grade_level || teacher.gradeLevel || '';
    const section = teacher.section || '';
    let subjects = teacher.subjects || [];
    
    // Handle different subjects data formats
    if (typeof subjects === 'string') {
      // Try parsing as JSON array first
      if (subjects.startsWith('[')) {
        try {
          subjects = JSON.parse(subjects);
        } catch (e) {
          subjects = subjects.split(',').map(s => s.trim()).filter(s => s);
        }
      } else {
        subjects = subjects.split(',').map(s => s.trim()).filter(s => s);
      }
    } else if (!Array.isArray(subjects)) {
      subjects = [];
    }
    
    const bio = teacher.bio || '';
    
    // Handle kindergarten subjects from bio field
    if (gradeLevel === 'Kindergarten' && bio && bio.trim() !== '') {
      return {
        actualGradeLevel: gradeLevel,
        actualSection: section,
        actualSubjects: [bio] // Show kindergarten subjects from bio
      };
    }
    
    // Check if grade_level contains subject names (common subjects)
    const commonSubjects = ['filipino', 'english', 'mathematics', 'science', 'makabansa', 'gmrc', 'mapeh', 'araling panlipunan', 'edukasyon sa pagpapakatao', 'arpan'];
  
    // Guard against undefined gradeLevel
    if (!gradeLevel) {
      return {
        actualGradeLevel: '',
        actualSection: '',
        actualSubjects: []
      };
    }
  
    const gradeLevelLower = gradeLevel.toLowerCase();
  
    // If grade_level contains a subject, it's likely the actual subject
    if (commonSubjects.some(subject => gradeLevelLower.includes(subject))) {
      // Swap the data: grade_level becomes subject, section becomes grade_level
      return {
        actualGradeLevel: section,
        actualSection: '-', // No proper section available
        actualSubjects: [gradeLevel]
      };
    }
    
    // Check if section contains grade level patterns
    const gradePattern = /^(grade \d+|kindergarten|\d+)$/i;
    if (gradePattern.test(section.trim())) {
      return {
        actualGradeLevel: section,
        actualSection: gradeLevel,
        actualSubjects: subjects
      };
    }
    
    // Normal case - no swapping needed
    return {
      actualGradeLevel: gradeLevel,
      actualSection: section,
      actualSubjects: subjects
    };
  };

  // Function to fetch archived teachers
  const fetchArchivedTeachers = async () => {
    setArchivesLoading(true);
    try {
      const response = await api.get('/teachers/archived');
      const archivedData = response.data?.data?.teachers || response.data?.teachers || [];
      console.log('Archived teachers:', archivedData);
      setArchivedTeachers(Array.isArray(archivedData) ? archivedData : []);
    } catch (error) {
      console.error('Error fetching archived teachers:', error);
      // Don't show error toast for missing archive endpoint - just handle gracefully
      setArchivedTeachers([]);
      // Only show toast if it's not a 404 (endpoint doesn't exist)
      if (error.response && error.response.status !== 404) {
        toast.error('Error loading archived teachers: ' + error.message);
      }
    } finally {
      setArchivesLoading(false);
    }
  };

  // Function to restore archived teacher
  const handleRestoreTeacher = async (teacherId) => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      return;
    }
    // Find the teacher to restore
    const teacher = archivedTeachers.find(t => t.id === teacherId);
    setTeacherToRestore(teacher);
    setShowRestoreModal(true);
  };

  const confirmRestoreTeacher = async () => {
    if (!teacherToRestore) return;
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      setShowRestoreModal(false);
      return;
    }
    
    try {
      await api.put(`/teachers/${teacherToRestore.id}/restore`);
      await fetchArchivedTeachers();
      await fetchTeachers();
      setShowRestoreModal(false);
      setTeacherToRestore(null);
      toast.success('Teacher account has been restored successfully.');
      
      // Auto-close archives after successful restore
      setShowArchives(false);
    } catch (error) {
      console.error('Restore error:', error);
      setShowRestoreModal(false);
      setTeacherToRestore(null);
      toast.error('Error restoring teacher: ' + error.message);
    }
  };

  // Function to permanently delete archived teacher
  const handlePermanentDelete = async (teacherId) => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      return;
    }
    // Find the teacher to permanently delete
    const teacher = archivedTeachers.find(t => t.id === teacherId);
    setTeacherToPermanentDelete(teacher);
    setShowPermanentDeleteModal(true);
  };

  const confirmPermanentDelete = async () => {
    if (!teacherToPermanentDelete) return;
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      setShowPermanentDeleteModal(false);
      return;
    }
    
    try {
      await api.delete(`/teachers/${teacherToPermanentDelete.id}/permanent`);
      await fetchArchivedTeachers();
      setShowPermanentDeleteModal(false);
      setTeacherToPermanentDelete(null);
      toast.success('Teacher account has been permanently deleted.');
      
      // Auto-close archives after successful permanent delete
      setShowArchives(false);
    } catch (error) {
      console.error('Permanent delete error:', error);
      setShowPermanentDeleteModal(false);
      setTeacherToPermanentDelete(null);
      toast.error('Error permanently deleting teacher: ' + error.message);
    }
  };

  // Bulk permanent delete for archived teachers
  const handleBulkPermanentDelete = async () => {
    if (selectedArchivedTeachers.size === 0) return;
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      return;
    }
    
    const confirmed = window.confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedArchivedTeachers.size} archived teacher(s)? This cannot be undone.`);
    
    if (confirmed) {
      try {
        for (const teacherId of selectedArchivedTeachers) {
          await api.delete(`/teachers/${teacherId}/permanent`);
        }
        setSelectedArchivedTeachers(new Set());
        setSelectAllArchived(false);
        await fetchArchivedTeachers();
        toast.success(`${selectedArchivedTeachers.size} archived teacher(s) permanently deleted.`);
      } catch (error) {
        console.error('Bulk permanent delete error:', error);
        toast.error('Error deleting archived teachers: ' + error.message);
        await fetchArchivedTeachers();
      }
    }
  };

  const toggleSelectAllArchived = () => {
    if (selectAllArchived) {
      setSelectedArchivedTeachers(new Set());
      setSelectAllArchived(false);
    } else {
      setSelectedArchivedTeachers(new Set(archivedTeachers.map(t => t.id)));
      setSelectAllArchived(true);
    }
  };

  const handleSelectArchivedTeacher = (teacherId) => {
    const newSelected = new Set(selectedArchivedTeachers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedArchivedTeachers(newSelected);
    setSelectAllArchived(newSelected.size === archivedTeachers.length);
  };

  // Toggle archives view
  const toggleArchives = () => {
    if (!showArchives) {
      fetchArchivedTeachers();
    }
    setShowArchives(!showArchives);
  };

  const isViewOnly = isViewingLocked;

  const switchToActiveSchoolYear = () => {
    if (!activeSchoolYear?.id) return;
    const activeId = String(activeSchoolYear.id);
    setSelectedSchoolYearId(activeId);
    setViewingSchoolYear(activeSchoolYear);
  };

  const fetchTeachers = async (isRefresh = false) => {
    try {
      if (!selectedSchoolYearId) {
        setTeachers([]);
        setLoading(false);
        setRefreshLoading(false);
        return;
      }
      console.log('Fetching teachers...');
      if (isRefresh) {
        setRefreshLoading(true);
        // Force refresh by clearing cache and fetching fresh data
        console.log('🔄 Force refreshing data from server...');
        setTeachers([]); // Clear current data to show loading state
      } else {
        setLoading(true);
      }
      
      // Fetch teachers using the same pattern as assignadviser page
      let allTeachers = [];
      let primaryTeachersLoaded = false;
      try {
        const response = await api.get('/teachers', {
          params: { schoolYearId: selectedSchoolYearId }
        });
        primaryTeachersLoaded = true;
        const teachersData = response.data?.data?.teachers || response.data?.teachers || [];
        console.log('Teachers fetched from /teachers:', teachersData);
        console.log('Teachers data type:', typeof teachersData);
        console.log('Teachers data is array:', Array.isArray(teachersData));
        console.log('Raw response data:', response.data);
        console.log('Response status:', response.status);
        
        // Only show approved teachers (not pending or declined)
        allTeachers = Array.isArray(teachersData) 
          ? teachersData
              .map(normalizeTeacherRecord)
              .filter(teacher => {
              const status = teacher.status;
              const role = teacher.role;
              console.log('Checking teacher:', teacher.firstName, role, status);
              const isRoleMatch = role === 'adviser' || role === 'subject_teacher' || role === 'teacher';
              const isVisibleStatus = isVisibleTeacherStatus(status);
              return isRoleMatch && isVisibleStatus;
            })
          : [];
      } catch (err) {
        console.log('Could not fetch from /teachers:', err.message);
      }
      
      // If /teachers didn't work, try the fallback pattern from assignadviser
      if (!primaryTeachersLoaded) {
        try {
          const usersResponse = await api.get('/users', {
            params: { schoolYearId: selectedSchoolYearId }
          });
          const usersData = usersResponse.data?.data || usersResponse.data?.users || [];
          console.log('Users fetched from /users:', usersData);
          
          allTeachers = Array.isArray(usersData)
            ? usersData
              .map(normalizeTeacherRecord)
              .filter(u => {
                const status = u.status;
                const role = u.role;
                console.log('Checking user from fallback:', u.firstName, role, status);
                const isRoleMatch = role === 'adviser' || role === 'subject_teacher' || role === 'teacher';
                const isVisibleStatus = isVisibleTeacherStatus(status);
                return isRoleMatch && isVisibleStatus;
              })
            : [];
          
          console.log('Filtered teachers from users:', allTeachers);
        } catch (err) {
          console.log('Could not fetch from /users:', err.message);
        }
      }
      
      console.log('Final teachers list:', allTeachers);
      console.log('Teachers count:', allTeachers.length);
      
      // Force update even if data is the same (for real refresh)
      setTeachers(prev => {
        console.log('🔄 Previous teachers count:', prev.length);
        console.log('🔄 New teachers count:', allTeachers.length);
        return allTeachers;
      });
      
      if (!isRefresh) {
        if (allTeachers.length === 0) {
          toast.warning('No teachers found in the system');
        } else {
          toast.success(`Loaded ${allTeachers.length} teachers`);
        }
      }
    } catch (error) {
      console.error('Error in fetchTeachers:', error);
      toast.error('Error loading teachers: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  };

  // Fetch teachers from previous school year (listing only)
  const loadPrevTeachers = async () => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to fetch teachers.');
      return;
    }
    if (!selectedSchoolYearId) {
      toast.error('Select a school year first');
      return;
    }
    setFetchPrevLoading(true);
    try {
      const res = await api.get('/teachers/previous-year', {
        params: { schoolYearId: selectedSchoolYearId }
      });
      const list = res.data?.data || [];
      setPrevTeachers(Array.isArray(list) ? list : []);
      setSelectedPrevTeacherIds(new Set(list.map((t) => t.id)));
    } catch (error) {
      console.error('Error loading previous year teachers:', error);
      setPrevTeachers([]);
      toast.error(error.response?.data?.message || 'Failed to load previous year teachers');
    } finally {
      setFetchPrevLoading(false);
    }
  };

  // Copy selected teachers from previous school year into active school year
  const handleFetchTeachersFromPrevious = async () => {
    if (selectedPrevTeacherIds.size === 0) return;
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to copy teachers.');
      return;
    }
    if (!selectedSchoolYearId) {
      toast.error('Select a school year first');
      return;
    }
    setFetchPrevSubmitting(true);
    try {
      const ids = Array.from(selectedPrevTeacherIds);
      const res = await api.post(`/teachers/fetch-from-previous?schoolYearId=${selectedSchoolYearId}`, { ids });
      const inserted = res.data?.data?.inserted ?? 0;
      const updated = res.data?.data?.updated ?? 0;
      const skipped = res.data?.data?.skipped ?? 0;
      toast.success(`Fetched ${inserted} teacher(s), updated ${updated}, skipped ${skipped}`);
      switchToActiveSchoolYear();
      toast.info(`Showing teachers in active school year ${activeSchoolYear?.label || ''}`.trim());
      setShowFetchModal(false);
    } catch (error) {
      console.error('Error fetching teachers from previous year:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch teachers from previous year');
    } finally {
      setFetchPrevSubmitting(false);
    }
  };

  const togglePrevTeacherSelection = (id) => {
    const next = new Set(selectedPrevTeacherIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPrevTeacherIds(next);
  };

  const toggleSelectAllPrevTeachers = () => {
    if (selectedPrevTeacherIds.size === prevTeachers.length) {
      setSelectedPrevTeacherIds(new Set());
    } else {
      setSelectedPrevTeacherIds(new Set(prevTeachers.map((t) => t.id)));
    }
  };

  // Filter teachers by search
  const filteredTeachers = teachers.filter(teacher => {
    const normalizedStatus = normalizeTeacherStatus(teacher);
    const matchesSearch = searchQuery === '' ||
      (teacher.firstName && teacher.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (teacher.lastName && teacher.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (teacher.email && teacher.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = matchesStatusFilter(normalizedStatus, statusFilter);
    return matchesSearch && matchesStatus;
  });

  const statusFilterOptions = [
    { key: 'all', label: 'All', count: teachers.length },
    {
      key: 'active',
      label: 'Active',
      count: teachers.filter((teacher) => matchesStatusFilter(normalizeTeacherStatus(teacher), 'active')).length
    },
    {
      key: 'inactive',
      label: 'Inactive',
      count: teachers.filter((teacher) => matchesStatusFilter(normalizeTeacherStatus(teacher), 'inactive')).length
    },
    {
      key: 'pending',
      label: 'Pending',
      count: teachers.filter((teacher) => matchesStatusFilter(normalizeTeacherStatus(teacher), 'pending')).length
    }
  ];

  // Selection handlers for different teacher types
  const handleSelectAdviser = (teacherId) => {
    const newSelected = new Set(selectedAdvisers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedAdvisers(newSelected);

    // Update table-level selectAllAdvisers state
    const advisers = filteredTeachers.filter(t => t.role === 'adviser');
    const allAdvisersSelected = advisers.length > 0 && advisers.every(t => newSelected.has(t.id));
    setSelectAllAdvisers(allAdvisersSelected);

    // Update main selectAll state (both tables must be fully selected)
    const subjectTeachers = filteredTeachers.filter(t => t.role === 'subject_teacher');
    const allSubjectTeachersSelected = subjectTeachers.every(t => selectedSubjectTeachers.has(t.id));
    setSelectAll(allAdvisersSelected && allSubjectTeachersSelected);
  };

  const handleSelectSubjectTeacher = (teacherId) => {
    const newSelected = new Set(selectedSubjectTeachers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedSubjectTeachers(newSelected);

    // Update table-level selectAllSubjectTeachers state
    const subjectTeachers = filteredTeachers.filter(t => t.role === 'subject_teacher');
    const allSubjectTeachersSelected = subjectTeachers.length > 0 && subjectTeachers.every(t => newSelected.has(t.id));
    setSelectAllSubjectTeachers(allSubjectTeachersSelected);

    // Update main selectAll state (both tables must be fully selected)
    const advisers = filteredTeachers.filter(t => t.role === 'adviser');
    const allAdvisersSelected = advisers.every(t => selectedAdvisers.has(t.id));
    setSelectAll(allAdvisersSelected && allSubjectTeachersSelected);
  };

  // Keep the original handler for backward compatibility (updates all selections)
  const handleSelectTeacher = (teacherId) => {
    const teacher = filteredTeachers.find(t => t.id === teacherId);
    if (teacher?.role === 'adviser') {
      handleSelectAdviser(teacherId);
    } else if (teacher?.role === 'subject_teacher') {
      handleSelectSubjectTeacher(teacherId);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      // Unselect all teachers from both tables
      setSelectedAdvisers(new Set());
      setSelectedSubjectTeachers(new Set());
      setSelectAllAdvisers(false);
      setSelectAllSubjectTeachers(false);
      setSelectAll(false);
    } else {
      // Select all teachers from both tables
      const advisers = filteredTeachers.filter(t => t.role === 'adviser');
      const subjectTeachers = filteredTeachers.filter(t => t.role === 'subject_teacher');
      
      setSelectedAdvisers(new Set(advisers.map(t => t.id)));
      setSelectedSubjectTeachers(new Set(subjectTeachers.map(t => t.id)));
      setSelectAllAdvisers(true);
      setSelectAllSubjectTeachers(true);
      setSelectAll(true);
    }
  };

  const toggleSelectAllAdvisers = () => {
    const advisers = filteredTeachers.filter(t => t.role === 'adviser');
    if (selectAllAdvisers) {
      // Unselect all advisers
      setSelectedAdvisers(new Set());
      setSelectAllAdvisers(false);
    } else {
      // Select all advisers
      setSelectedAdvisers(new Set(advisers.map(t => t.id)));
      setSelectAllAdvisers(true);
    }
    
    // Update main selectAll state (both tables must be fully selected)
    const subjectTeachers = filteredTeachers.filter(t => t.role === 'subject_teacher');
    const allSubjectTeachersSelected = subjectTeachers.every(t => selectedSubjectTeachers.has(t.id));
    setSelectAll(selectAllAdvisers && allSubjectTeachersSelected);
  };

  const toggleSelectAllSubjectTeachers = () => {
    const subjectTeachers = filteredTeachers.filter(t => t.role === 'subject_teacher');
    if (selectAllSubjectTeachers) {
      // Unselect all subject teachers
      setSelectedSubjectTeachers(new Set());
      setSelectAllSubjectTeachers(false);
    } else {
      // Select all subject teachers
      setSelectedSubjectTeachers(new Set(subjectTeachers.map(t => t.id)));
      setSelectAllSubjectTeachers(true);
    }
    
    // Update main selectAll state (both tables must be fully selected)
    const advisers = filteredTeachers.filter(t => t.role === 'adviser');
    const allAdvisersSelected = advisers.every(t => selectedAdvisers.has(t.id));
    setSelectAll(allAdvisersSelected && selectAllSubjectTeachers);
  };

  const handleBulkDelete = async () => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      return;
    }
    // Combine all selected teachers from both tables
    const allSelectedTeachers = new Set([...selectedAdvisers, ...selectedSubjectTeachers]);
    
    if (allSelectedTeachers.size === 0) return;
    
    // Use toast confirm instead of window.confirm
    const confirmed = window.confirm(`Are you sure you want to archive ${allSelectedTeachers.size} teachers? The accounts will be moved to archives and permanently deleted after 30 days.`);
    
    if (confirmed) {
      try {
        // Archive teachers instead of permanent deletion
        for (const teacherId of allSelectedTeachers) {
          await api.put(`/teachers/${teacherId}/archive`);
        }
        // Clear all selections
        setSelectedAdvisers(new Set());
        setSelectedSubjectTeachers(new Set());
        setSelectAllAdvisers(false);
        setSelectAllSubjectTeachers(false);
        await fetchTeachers();
        toast.success(`${allSelectedTeachers.size} teacher accounts have been archived and will be permanently deleted after 30 days.`);
        
        // Auto-open archives to show the archived teachers
        setShowArchives(true);
        fetchArchivedTeachers();
      } catch (error) {
        // Fallback to regular delete if archive endpoint doesn't exist
        console.log('Archive endpoint not found, falling back to bulk delete');
        try {
          for (const teacherId of allSelectedTeachers) {
            await api.delete(`/teachers/${teacherId}`);
          }
          // Clear all selections
          setSelectedAdvisers(new Set());
          setSelectedSubjectTeachers(new Set());
          setSelectAllAdvisers(false);
          setSelectAllSubjectTeachers(false);
          await fetchTeachers();
          toast.success(`${allSelectedTeachers.size} teacher records have been removed (permanent deletion).`);
        } catch (deleteError) {
          console.error('Bulk delete error:', deleteError);
          // Clear all selections
          setSelectedAdvisers(new Set());
          setSelectedSubjectTeachers(new Set());
          setSelectAllAdvisers(false);
          setSelectAllSubjectTeachers(false);
          toast.error('Bulk delete functionality not available');
          toast.info('The teacher deletion endpoints are not implemented on the server yet.');
          toast.info('Please contact your administrator to set up the teacher management API endpoints.');
        }
      }
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      return;
    }
    // Find the teacher to delete
    const teacher = filteredTeachers.find(t => t.id === teacherId);
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      setShowDeleteModal(false);
      return;
    }
    
    try {
      // Archive teacher instead of permanent deletion
      await api.put(`/teachers/${teacherToDelete.id}/archive`);
      await fetchTeachers();
      setShowDeleteModal(false);
      setTeacherToDelete(null);
      toast.success('Teacher account has been archived and will be permanently deleted after 30 days.');
      
      // Auto-open archives to show the archived teacher
      setShowArchives(true);
      fetchArchivedTeachers();
    } catch (error) {
      // Fallback to regular delete if archive endpoint doesn't exist
      console.log('Archive endpoint not found, falling back to delete');
      try {
        await api.delete(`/teachers/${teacherToDelete.id}`);
        await fetchTeachers();
        setShowDeleteModal(false);
        setTeacherToDelete(null);
        toast.success('Teacher record has been removed (permanent deletion).');
      } catch (deleteError) {
        console.error('Delete error:', deleteError);
        setShowDeleteModal(false);
        setTeacherToDelete(null);
        toast.error('Delete functionality not available');
        toast.info('The teacher deletion endpoints are not implemented on the server yet.');
        toast.info('Please contact your administrator to set up the teacher management API endpoints.');
      }
    }
  };

  const handleViewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
  };

  const handleViewCredentials = async (teacher) => {
    setCredentialsLoading(true);
    try {
      console.log('Getting credentials for teacher:', teacher.id);
      
      // Try to fetch credentials from API first
      const response = await fetch(`${API_BASE_URL}/teachers/${teacher.id}/credentials`);
      
      if (response.ok) {
        const credentialsData = await response.json();
        console.log('Fetched credentials from API:', credentialsData);
        setSelectedTeacher({
          ...teacher,
          ...credentialsData,
          plainPassword: credentialsData.password // Map password to plainPassword for modal
        });
        setShowCredentialsModal(true);
      } else {
        // Fallback to determine password based on account creation method
        let passwordToShow = teacher.plainPassword || teacher.password;
        
        // If no password from teacher data, determine based on account creation patterns
        if (!passwordToShow) {
          // Check if this looks like a bulk imported account
          // Bulk imported accounts typically have:
          // 1. Very simple usernames (usually just first name, no special characters)
          // 2. WMSU email pattern
          // 3. No stored plainPassword
          // 4. No generated password pattern in data
          
          // More restrictive bulk import detection
          // Only consider bulk import if username is extremely simple AND no email-based pattern
          const isBulkImport = (
            teacher.username && 
            teacher.username.length <= 6 && // Very short usernames only
            !teacher.plainPassword && // No stored generated password
            (!teacher.password || teacher.password === 'Password123') && // Default password or no password
            teacher.email && teacher.email.includes('@wmsu.edu.ph') &&
            !teacher.email.match(/\d/) && // Email has no numbers (bulk imports usually don't)
            teacher.firstName && teacher.username === teacher.firstName.toLowerCase() // Username matches first name exactly
          );
          
          if (isBulkImport) {
            passwordToShow = generateWmsuPassword(teacher);
            console.log('Detected bulk imported teacher:', teacher.username);
          } else {
            // For individually created accounts, try to determine the actual generated password
            if (teacher.email && teacher.email.includes('@wmsu.edu.ph')) {
              passwordToShow = generateWmsuPassword(teacher);
              console.log('Detected individually created teacher, exact password:', passwordToShow);
            } else {
              passwordToShow = generateWmsuPassword(teacher);
              console.log('Using fallback password for teacher:', teacher.username);
            }
          }
        }
        
        // Merge credentials with teacher data
        const teacherWithCredentials = {
          ...teacher,
          plainPassword: passwordToShow,
          username: teacher.username,
          email: teacher.email
        };
        
        console.log('Teacher credentials determined:', teacherWithCredentials);
        setSelectedTeacher(teacherWithCredentials);
        setShowCredentialsModal(true);
        
        // Show appropriate message based on password accuracy
        if (passwordToShow && passwordToShow.includes('XXXX')) {
          toast.info('Generated password pattern shown. Exact password may vary.', { duration: 4000 });
        }
      }
      
    } catch (error) {
      console.error('Error fetching teacher credentials:', error);
      
      // Fallback to determine password based on account creation method
      let passwordToShow = teacher.plainPassword || teacher.password;
      
      // If no password from teacher data, determine based on account creation patterns
      if (!passwordToShow) {
        // More restrictive bulk import detection
        // Only consider bulk import if username is extremely simple AND no email-based pattern
        const isBulkImport = (
          teacher.username && 
          teacher.username.length <= 6 && // Very short usernames only
          !teacher.plainPassword && // No stored generated password
          (!teacher.password || teacher.password === 'Password123') && // Default password or no password
          teacher.email && teacher.email.includes('@wmsu.edu.ph') &&
          !teacher.email.match(/\d/) && // Email has no numbers (bulk imports usually don't)
          teacher.firstName && teacher.username === teacher.firstName.toLowerCase() // Username matches first name exactly
        );
        
        if (isBulkImport) {
          passwordToShow = 'Password123'; // Default for bulk imports
          console.log('Error fallback - Detected bulk imported teacher:', teacher.username);
        } else {
          // For individually created accounts, try to determine the actual generated password
          if (teacher.email && teacher.email.includes('@wmsu.edu.ph')) {
            const emailPart = teacher.email.replace('@wmsu.edu.ph', '').slice(-4).padStart(4, '0');
            // Use predictable pattern: WMSU{emailPart}0000
            passwordToShow = `WMSU${emailPart}0000`;
            console.log('Error fallback - Detected individually created teacher, exact password:', passwordToShow);
          } else {
            passwordToShow = 'Password123'; // Final fallback
            console.log('Error fallback - Using fallback password for teacher:', teacher.username);
          }
        }
      }
      
      const teacherWithCredentials = {
        ...teacher,
        plainPassword: passwordToShow,
        username: teacher.username,
        email: teacher.email
      };
      
      setSelectedTeacher(teacherWithCredentials);
      setShowCredentialsModal(true);
      
      if (passwordToShow && passwordToShow.includes('XXXX')) {
        toast.info('Generated password pattern shown. Exact password may vary.', { duration: 4000 });
      }
      
      toast.error('Failed to fetch credentials from server');
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleEditTeacher = (teacher) => {
    if (isAssignmentOnlyTeacher(teacher)) {
      toast.error('This row is assignment-only. Fetch or create the teacher account first.');
      return;
    }

    setSelectedTeacher(teacher);
    const normalizedStatus = normalizeTeacherStatus(teacher);
    const statusForForm = normalizedStatus === 'inactive' ? 'inactive' : 'active';
    // Handle subjects field - it can be string or array
    let subjectsArray = [];
    if (teacher.subjects) {
      if (Array.isArray(teacher.subjects)) {
        subjectsArray = teacher.subjects;
      } else if (typeof teacher.subjects === 'string') {
        subjectsArray = teacher.subjects.split(',').map(s => s.trim()).filter(s => s);
      }
    }
    
    setEditFormData({
      firstName: teacher.firstName || teacher.first_name,
      middleName: teacher.middleName || teacher.middle_name || '',
      lastName: teacher.lastName || teacher.last_name,
      email: teacher.email,
      sex: teacher.sex || '',
      contactNumber: teacher.contactNumber || teacher.contact_number || '',
      role: teacher.role || 'adviser',
      status: statusForForm,
      subjects: subjectsArray,
      kindergartenSubjects: teacher.kindergartenSubjects || '',
      gradeLevel: teacher.gradeLevel || teacher.grade_level || '',
      section: teacher.section || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to edit.');
      setShowEditModal(false);
      return;
    }
    if (isAssignmentOnlyTeacher(selectedTeacher)) {
      toast.error('Cannot update assignment-only row. Fetch/create teacher account first.');
      setShowEditModal(false);
      return;
    }
    try {
      console.log('Saving teacher with data:', editFormData);

      const normalizedEmail = String(editFormData.email || '')
        .trim()
        .toLowerCase()
        .replace(/@wmsu\.edu\.com$/i, '@wmsu.edu.ph');

      if (!/^[^\s@]+@wmsu\.edu\.ph$/i.test(normalizedEmail)) {
        toast.error('Email must use @wmsu.edu.ph');
        return;
      }

      const normalizedEditStatus = String(editFormData.status || 'active').trim().toLowerCase();
      const statusPayload = normalizedEditStatus === 'inactive' ? 'inactive' : 'approved';
      
      // Prepare the data for API call - handle kindergarten subjects properly
      let updateData;
      
      if (editFormData.gradeLevel === 'Kindergarten') {
        // For kindergarten, store subjects in bio field as flexible text
        updateData = {
          firstName: String(editFormData.firstName || ''),
          middleName: String(editFormData.middleName || ''),
          lastName: String(editFormData.lastName || ''),
          username: String(selectedTeacher.username || ''),
          email: normalizedEmail,
          sex: String(editFormData.sex || ''),
          contactNumber: String(editFormData.contactNumber || ''),
          role: String(editFormData.role || ''),
          status: statusPayload,
          gradeLevel: String(editFormData.gradeLevel || ''),
          section: String(editFormData.section || ''),
          subjects: null, // No fixed subjects for kindergarten
          bio: String(editFormData.kindergartenSubjects || '') // Store kindergarten subjects in bio
        };
      } else {
        // For grade 1-6, store subjects as JSON array
        updateData = {
          firstName: String(editFormData.firstName || ''),
          middleName: String(editFormData.middleName || ''),
          lastName: String(editFormData.lastName || ''),
          username: String(selectedTeacher.username || ''),
          email: normalizedEmail,
          sex: String(editFormData.sex || ''),
          contactNumber: String(editFormData.contactNumber || ''),
          role: String(editFormData.role || ''),
          status: statusPayload,
          gradeLevel: String(editFormData.gradeLevel || ''),
          section: String(editFormData.section || ''),
          subjects: JSON.stringify(editFormData.subjects || []),
          bio: String(selectedTeacher.bio || '') // Keep existing bio
        };
      }

      console.log('Formatted update data:', updateData);
      console.log('Parameter count:', Object.keys(updateData).length);
      
      const response = await api.put(`/teachers/${selectedTeacher.id}`, updateData);
      
      console.log('Save response:', response.data);
      
      // Refresh the teachers list to show updated data
      await fetchTeachers();
      
      // Dispatch custom event to notify other pages of teacher role change
      window.dispatchEvent(new CustomEvent('teacherUpdated', {
        detail: {
          teacherId: selectedTeacher.id,
          oldRole: selectedTeacher.role,
          newRole: editFormData.role,
          teacherData: {
            id: selectedTeacher.id,
            firstName: editFormData.firstName,
            lastName: editFormData.lastName,
            email: editFormData.email,
            role: editFormData.role,
            gradeLevel: editFormData.gradeLevel,
            section: editFormData.section
          }
        }
      }));
      
      // Close the modal
      setShowEditModal(false);
      
      // Show success message
      toast.success('Teacher information has been successfully updated');
      
      // Clear form data
      setEditFormData({});
      setSelectedTeacher(null);
      
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast.error('Error updating teacher: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="space-y-4 md:space-y-10">
      <div className="bg-white rounded-lg shadow p-3 md:p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-2 md:gap-4 mb-4">
          <UsersIcon className="w-12 md:w-20 h-12 md:h-20 text-red-800 transition-transform duration-300 hover:scale-105 flex-shrink-0" />
          <h2 className="text-2xl md:text-5xl pl-0 md:pl-5 font-bold text-gray-900">Teachers Management</h2>
        </div>
      </div>

      <p className="text-xs md:text-base text-gray-600 mb-4">
        View, verify, edit, or archive teacher accounts. 
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">School Year</label>
          <select
            value={selectedSchoolYearId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedSchoolYearId(nextId);
              const matched = schoolYears.find((sy) => String(sy.id) === String(nextId));
              if (matched) setViewingSchoolYear(matched);
            }}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Select school year</option>
            {schoolYears.map((sy) => (
              <option key={sy.id} value={sy.id}>{sy.label}</option>
            ))}
          </select>
          {isViewOnly && (
            <>
              <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">View-only for previous year</span>
              <button
                type="button"
                onClick={switchToActiveSchoolYear}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Switch to Active Year
              </button>
            </>
          )}
        </div>
        {isViewOnly && (
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
            Teachers fetched from previous year are copied into the active school year. Switch to active year to view and edit fetched teachers.
          </p>
        )}
        {!selectedSchoolYearId && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">Select a school year to load teachers.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Total Teachers</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.length}</p>
        </div>
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Advisers</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.filter(t => t.role === 'adviser').length}</p>
        </div>
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Subject Teachers</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.filter(t => t.role === 'subject_teacher').length}</p>
        </div>
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Unassigned</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.filter(t => t.role === 'teacher').length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-red-800 mb-2">Teacher Actions</h3>
          <ul className="list-disc ml-5 text-xs md:text-base text-gray-700 space-y-1">
            <li>Add new teachers via bulk import (CSV)</li>
            <li>Search and filter teachers</li>
            <li>View teacher details</li>
            <li>Edit teacher information</li>
            <li>Archive and delete teacher accounts (single or bulk)</li>
            <li>Assign subjects for subject teachers</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button
            onClick={() => {
              setShowFetchModal(true);
              loadPrevTeachers();
            }}
            disabled={isViewOnly}
            className="bg-emerald-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-emerald-700 font-semibold flex items-center justify-center gap-2 text-xs md:text-base h-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="w-4 md:w-5 h-4 md:h-5" />
            Fetch Prev Year
          </button>
          <button
            onClick={() => navigate('/admin/create-teacher')}
            disabled={isViewOnly}
            className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 text-xs md:text-base h-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-lg">+</span>
            Add Teacher
          </button>
          <button
            onClick={() => setShowBulkImportModal(true)}
            disabled={isViewOnly}
            className="bg-green-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 text-xs md:text-base h-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpTrayIcon className="w-4 md:w-5 h-4 md:h-5" />
            Bulk Import
          </button>
          <button
            onClick={toggleArchives}
            className="bg-gray-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-gray-700 font-semibold flex items-center justify-center gap-2 text-xs md:text-base h-fit"
          >
            <svg className="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {showArchives ? 'Hide Archives' : 'View Archives'}
          </button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-800">
            All Teachers
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTeachers(true)}
              disabled={refreshLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200"
            >
              {refreshLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0112 20c5.159 0 9.829-2.778 11.628-7.658l2.519 2.519a1 1 0 00.707.293l-2.519-2.519a8 8 0 01-2.778 11.628z"></path>
                  </svg>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
            <div className="text-sm text-gray-600">
              Total: {teachers.length}
            </div>
            {(() => {
                const totalSelected = selectedAdvisers.size + selectedSubjectTeachers.size;
                return totalSelected > 0 ? (
                  <>
                    <button
                      onClick={handleBulkDelete}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-semibold"
                    >
                      Archive Selected ({totalSelected})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAdvisers(new Set());
                        setSelectedSubjectTeachers(new Set());
                        setSelectAllAdvisers(false);
                        setSelectAllSubjectTeachers(false);
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-semibold"
                    >
                      Unselect All ({totalSelected})
                    </button>
                  </>
                ) : filteredTeachers.filter(t => t.role === 'adviser').length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                  >
                    {selectAll ? 'Unselect All' : 'Select All'}
                  </button>
                );
              })()}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name or Email</label>
            <input
              type="text"
              placeholder="Enter teacher name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            {statusFilterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStatusFilter(option.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${statusFilter === option.key
                  ? 'bg-red-700 text-white border-red-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
          {searchQuery && (
            <div className="text-sm text-gray-600 mt-2">
              Searching for "{searchQuery}" <span className="font-semibold">{filteredTeachers.length} result{filteredTeachers.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Advisers Table */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-1">
                Advisers
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-yellow-100 text-yellow-800">
                  <tr>
                    <th className="p-3 border text-center">
                      <input
                        type="checkbox"
                        checked={selectAllAdvisers}
                        onChange={toggleSelectAllAdvisers}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Email</th>
                    <th className="p-3 border">Role</th>
                    <th className="p-3 border">Class/Section</th>
                    <th className="p-3 border">Subjects</th>
                    <th className="p-3 border w-40 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.filter(t => t.role === 'adviser').length > 0 ? (
                    filteredTeachers.filter(t => t.role === 'adviser').map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 border-t">
                        <td className="p-3 border text-center">
                          <input
                            type="checkbox"
                            checked={selectedAdvisers.has(teacher.id)}
                            onChange={() => handleSelectAdviser(teacher.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 border">
                          <span className="font-medium">{teacher.first_name || teacher.firstName} {teacher.last_name || teacher.lastName}</span>
                        </td>
                        <td className="p-3 border text-sm text-gray-600">{teacher.email}</td>
                        <td className="p-3 border">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                            Adviser
                          </span>
                        </td>
                        <td className="p-3 border text-sm">
                          {(() => {
                            if (Array.isArray(teacher.classSections) && teacher.classSections.length > 0) {
                              return teacher.classSections.join(', ');
                            }
                            const fixed = fixGradeAndSection(teacher);
                            return fixed.actualGradeLevel && fixed.actualSection 
                              ? `${fixed.actualGradeLevel} - ${fixed.actualSection}`
                              : '-';
                          })()}
                        </td>
                        <td className="p-3 border text-sm max-w-xs break-words">
                          {(() => {
                            try {
                              const directSubjects = Array.isArray(teacher.subjectsHandled)
                                ? teacher.subjectsHandled
                                : Array.isArray(teacher.subjects)
                                  ? teacher.subjects
                                  : [];
                              if (directSubjects.length > 0) {
                                return [...new Set(directSubjects.filter(Boolean))].join(', ');
                              }
                              const fixed = fixGradeAndSection(teacher);
                              if (fixed.actualSubjects && fixed.actualSubjects.length > 0) {
                                return fixed.actualSubjects.join(', ');
                              }
                              return '-';
                            } catch (error) {
                              console.error('Error parsing subjects:', error);
                              return '-';
                            }
                          })()}
                        </td>
                          <td className="p-3 border w-40">
                            <div className="flex gap-2 justify-center items-center">
                              <button 
                                onClick={() => handleEditTeacher(teacher)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                title="Edit"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </button>

                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                title="Archive Teacher"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={() => handleViewTeacher(teacher)}
                                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                title="View Details"
                              >
                                <EyeIcon className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={() => handleViewCredentials(teacher)}
                                disabled={credentialsLoading}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={credentialsLoading ? "Loading..." : "View Credentials"}
                              >
                                {credentialsLoading ? (
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <KeyIcon className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-500">
                        {searchQuery ? 'No advisers found matching your search' : 'No advisers available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subject Teachers Table */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-1">
                Subject Teachers 
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-purple-100 text-purple-800">
                  <tr>
                    <th className="p-3 border text-center">
                      <input
                        type="checkbox"
                        checked={selectAllSubjectTeachers}
                        onChange={toggleSelectAllSubjectTeachers}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Email</th>
                    <th className="p-3 border">Role</th>
                    <th className="p-3 border">Class/Section</th>
                    <th className="p-3 border">Subjects</th>
                    <th className="p-3 border w-40 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.filter(t => t.role === 'subject_teacher').length > 0 ? (
                    filteredTeachers.filter(t => t.role === 'subject_teacher').map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 border-t">
                        <td className="p-3 border text-center">
                          <input
                            type="checkbox"
                            checked={selectedSubjectTeachers.has(teacher.id)}
                            onChange={() => handleSelectSubjectTeacher(teacher.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 border">
                          <span className="font-medium">{teacher.first_name || teacher.firstName} {teacher.last_name || teacher.lastName}</span>
                        </td>
                        <td className="p-3 border text-sm text-gray-600">{teacher.email}</td>
                        <td className="p-3 border">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-800">
                            Subject Teacher
                          </span>
                        </td>
                        <td className="p-3 border text-sm">
                          {(() => {
                            const fixed = fixGradeAndSection(teacher);
                            return fixed.actualGradeLevel && fixed.actualSection 
                              ? `${fixed.actualGradeLevel} - ${fixed.actualSection}`
                              : '-';
                          })()}
                        </td>
                        <td className="p-3 border text-sm max-w-xs break-words">
                          {(() => {
                            try {
                              const fixed = fixGradeAndSection(teacher);
                              if (fixed.actualSubjects && fixed.actualSubjects.length > 0) {
                                return fixed.actualSubjects.join(', ');
                              }
                              return '-';
                            } catch (error) {
                              console.error('Error parsing subjects:', error);
                              return '-';
                            }
                          })()}
                        </td>
                          <td className="p-3 border w-40">
                            <div className="flex gap-2 justify-center items-center">
                              <button 
                                onClick={() => handleEditTeacher(teacher)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                title="Edit"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </button>

                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                title="Archive Teacher"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={() => handleViewTeacher(teacher)}
                                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                title="View Details"
                              >
                                <EyeIcon className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={() => handleViewCredentials(teacher)}
                                disabled={credentialsLoading}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={credentialsLoading ? "Loading..." : "View Credentials"}
                              >
                                {credentialsLoading ? (
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <KeyIcon className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-500">
                        {searchQuery ? 'No subject teachers found matching your search' : 'No subject teachers available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Unassigned Teachers Table */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                Unassigned Teachers
              </h3>
              <p className="text-xs text-gray-500">Teachers not yet assigned a role. Go to <strong>Assign Adviser</strong> to assign them.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Email</th>
                    <th className="p-3 border">Status</th>
                    <th className="p-3 border w-40 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.filter(t => t.role === 'teacher').length > 0 ? (
                    filteredTeachers.filter(t => t.role === 'teacher').map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 border-t">
                        <td className="p-3 border">
                          <span className="font-medium">{teacher.first_name || teacher.firstName} {teacher.last_name || teacher.lastName}</span>
                        </td>
                        <td className="p-3 border text-sm text-gray-600">{teacher.email}</td>
                        <td className="p-3 border">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">
                            Unassigned
                          </span>
                        </td>
                        <td className="p-3 border w-40">
                          <div className="flex gap-2 justify-center items-center">
                            <button 
                              onClick={() => handleEditTeacher(teacher)}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              title="Edit"
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTeacher(teacher.id)}
                              className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                              title="Archive Teacher"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>

                            <button 
                              onClick={() => handleViewTeacher(teacher)}
                              className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                              title="View Details"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>

                            <button 
                              onClick={() => handleViewCredentials(teacher)}
                              disabled={credentialsLoading}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={credentialsLoading ? "Loading..." : "View Credentials"}
                            >
                              {credentialsLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <KeyIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        {searchQuery ? 'No unassigned teachers found matching your search' : 'No unassigned teachers — all teachers have been assigned a role'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Fetch from Previous Year Modal */}
      {showFetchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Fetch Teachers from Previous School Years</h3>
                <p className="text-sm text-gray-600">Selected teachers are copied into the active school year. Existing records are updated and reactivated automatically.</p>
              </div>
              <button
                onClick={() => setShowFetchModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-sm text-gray-700">
                {fetchPrevLoading ? 'Loading previous year teachers...' : `${prevTeachers.length} teacher(s) available from previous years`}
              </div>
              <button
                onClick={toggleSelectAllPrevTeachers}
                className="text-sm px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={fetchPrevLoading || prevTeachers.length === 0}
              >
                {selectedPrevTeacherIds.size === prevTeachers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="px-6 pb-4 flex-1 overflow-y-auto">
              <div className="border rounded-lg overflow-hidden">
                {fetchPrevLoading ? (
                  <div className="py-10 text-center text-gray-500">Loading...</div>
                ) : prevTeachers.length === 0 ? (
                  <div className="py-10 text-center text-gray-500">No teachers found in previous school year.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left w-16">Select</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Role</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Class/Section</th>
                        <th className="p-3 text-left">Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prevTeachers.map((teacher) => {
                        const fixed = fixGradeAndSection({
                          ...teacher,
                          grade_level: teacher.grade_level || teacher.gradeLevel,
                          firstName: teacher.first_name,
                          lastName: teacher.last_name,
                        });
                        const prevStatus = normalizeTeacherStatus(teacher);
                        return (
                          <tr key={teacher.id} className="border-t hover:bg-gray-50">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedPrevTeacherIds.has(teacher.id)}
                                onChange={() => togglePrevTeacherSelection(teacher.id)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-medium text-gray-900">
                              {teacher.first_name || teacher.firstName} {teacher.last_name || teacher.lastName}
                            </td>
                            <td className="p-3 text-gray-700">{teacher.email}</td>
                            <td className="p-3">
                              <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 capitalize">{teacher.role?.replace('_', ' ') || 'teacher'}</span>
                            </td>
                            <td className="p-3">
                              <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${prevStatus === 'inactive'
                                ? 'bg-yellow-100 text-yellow-800'
                                : prevStatus === 'approved' || prevStatus === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : prevStatus === 'pending'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'}`}>
                                {prevStatus || 'approved'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-700">{fixed.actualGradeLevel && fixed.actualSection ? `${fixed.actualGradeLevel} - ${fixed.actualSection}` : '-'}</td>
                            <td className="p-3 text-gray-700">{fixed.actualSubjects?.length ? fixed.actualSubjects.join(', ') : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button
                onClick={() => setShowFetchModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={fetchPrevSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleFetchTeachersFromPrevious}
                disabled={fetchPrevSubmitting || fetchPrevLoading || selectedPrevTeacherIds.size === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {fetchPrevSubmitting ? 'Fetching...' : `Fetch ${selectedPrevTeacherIds.size || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      <TeacherBulkImportModal 
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchTeachers(true);
          setShowBulkImportModal(false);
        }}
      />

      {/* VIEW TEACHER MODAL */}
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4">
              <h3 className="text-xl font-bold text-red-800">Teacher Details</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-4">
              {/* Profile Picture */}
              <div className="flex justify-center mb-6">
                {selectedTeacher.profilePic ? (
                  <img 
                    src={
                      (() => {
                        const profilePic = selectedTeacher.profilePic;
                        console.log('Teacher profile pic data:', profilePic);
                        console.log('API_BASE:', API_BASE);
                        
                        let finalUrl;
                        if (profilePic.startsWith('http')) {
                          finalUrl = profilePic;
                        } else if (profilePic.startsWith('/')) {
                          finalUrl = `${API_BASE?.replace(/\/api$/, '') || ''}${profilePic}`;
                        } else {
                          finalUrl = `${API_BASE?.replace(/\/api$/, '') || ''}/${profilePic}`;
                        }
                        
                        console.log('Final profile pic URL:', finalUrl);
                        return finalUrl;
                      })()
                    } 
                    alt={`${selectedTeacher.firstName} ${selectedTeacher.lastName}`}
                    className="w-24 h-24 rounded-full object-cover border-4 border-red-800"
                    onError={(e) => {
                      console.error('Profile picture failed to load:', e.target.src);
                      e.target.onerror = null;
                      e.target.src = '/default-avatar.jpeg';
                    }}
                  />
                ) : (
                  <img 
                    src='/default-avatar.jpeg'
                    alt="Default Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-red-800"
                  />
                )}
              </div>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">
                    {selectedTeacher.firstName} {selectedTeacher.middleName ? `${selectedTeacher.middleName} ` : ''}{selectedTeacher.lastName}
                  </p>
                </div>
                
                {/* Username */}
                <div>
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-semibold">{selectedTeacher.username || '-'}</p>
                </div>
                
                {/* Email */}
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedTeacher.email}</p>
                </div>

                {/* Contact Number */}
                <div>
                  <p className="text-sm text-gray-600">Contact Number</p>
                  <p className="font-semibold">{selectedTeacher.contactNumber || selectedTeacher.contact_number || '-'}</p>
                </div>

                {/* Sex */}
                <div>
                  <p className="text-sm text-gray-600">Sex</p>
                  <p className="font-semibold">{selectedTeacher.sex || '-'}</p>
                </div>
                
                {/* Class/Section Assigned */}
                <div>
                  <p className="text-sm text-gray-600">Class/Section Assigned</p>
                  <p className="font-semibold">
                    {selectedTeacher.gradeLevel && selectedTeacher.section 
                      ? `${selectedTeacher.gradeLevel} - ${selectedTeacher.section}` 
                      : '-'}
                  </p>
                </div>
                
                {/* Role */}
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="font-semibold">
                    {selectedTeacher.role === 'subject_teacher' ? 'Subject Teacher' : selectedTeacher.role === 'adviser' ? 'Adviser' : 'Unassigned'}
                  </p>
                </div>
                
                {/* Subjects */}
                <div>
                  <p className="text-sm text-gray-600">Subjects</p>
                  <p className="font-semibold">
                    {(() => {
                      try {
                        const fixed = fixGradeAndSection(selectedTeacher);
                        if (fixed.actualSubjects && fixed.actualSubjects.length > 0) {
                          return fixed.actualSubjects.join(', ');
                        }
                        return '-';
                      } catch (error) {
                        console.error('Error parsing subjects:', error);
                        return '-';
                      }
                    })()}
                  </p>
                </div>
                
                {/* Department */}
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold">WMSU ILS - Elementary Department</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 pt-0">
              <button 
                onClick={() => setShowViewModal(false)}
                className="w-full bg-red-800 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4">
              <h3 className="text-xl font-bold text-red-800">Edit Teacher</h3>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-4">
              <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input 
                  type="text" 
                  value={editFormData.firstName || ''} 
                  onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                <input 
                  type="text" 
                  value={editFormData.middleName || ''} 
                  onChange={(e) => setEditFormData({...editFormData, middleName: e.target.value})}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input 
                  type="text" 
                  value={editFormData.lastName || ''} 
                  onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editFormData.email || ''} 
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={editFormData.contactNumber || ''}
                  onChange={(e) => setEditFormData({...editFormData, contactNumber: e.target.value})}
                  placeholder="e.g. 09123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                <select
                  value={editFormData.sex || ''}
                  onChange={(e) => setEditFormData({...editFormData, sex: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editFormData.role || ''} 
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                >
                  <option value="">Select Role</option>
                  <option value="teacher">Unassigned</option>
                  <option value="adviser">Adviser</option>
                  <option value="subject_teacher">Subject Teacher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                <select
                  value={editFormData.status || 'active'}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
                {editFormData.gradeLevel === "Kindergarten" ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-600 mb-2">
                      Kindergarten subjects (flexible - describe activities/subjects):
                    </p>
                    <textarea
                      value={editFormData.kindergartenSubjects || ''}
                      onChange={(e) => setEditFormData({...editFormData, kindergartenSubjects: e.target.value})}
                      rows="3"
                      placeholder="e.g., Basic Reading, Numbers, Shapes, Colors, Play Activities, Story Time..."
                      className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
                    />
                    <p className="text-xs text-gray-500">
                      Since Kindergarten students are pre-schoolers, subjects are flexible. We'll confirm with client.
                    </p>
                  </div>
                ) : editFormData.gradeLevel && subjectsByGradeLevel[editFormData.gradeLevel].length > 0 ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        Select subjects for {editFormData.gradeLevel}:
                      </p>
                      <button
                        type="button"
                        onClick={handleSelectAllSubjects}
                        className="px-3 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
                      >
                        {editFormData.subjects?.length === subjectsByGradeLevel[editFormData.gradeLevel].length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {subjectsByGradeLevel[editFormData.gradeLevel].map((subject) => (
                        <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            value={subject}
                            checked={editFormData.subjects?.includes(subject) || false}
                            onChange={(e) => {
                              const updatedSubjects = e.target.checked
                                ? [...(editFormData.subjects || []), subject]
                                : (editFormData.subjects || []).filter(s => s !== subject);
                              setEditFormData({...editFormData, subjects: updatedSubjects});
                            }}
                            className="w-4 h-4 text-red-800 border-gray-300 rounded focus:ring-red-800"
                          />
                          <span className="text-sm text-gray-700">{subject}</span>
                        </label>
                      ))}
                    </div>
                    {editFormData.subjects && editFormData.subjects.length > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        Selected: {editFormData.subjects.join(", ")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-500">
                      Please select a grade level first to see available subjects
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Works for both Advisers and Subject Teachers - select relevant subjects
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <select 
                  value={editFormData.gradeLevel || ''} 
                  onChange={(e) => setEditFormData({...editFormData, gradeLevel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                >
                  <option value="">Select Grade Level</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input 
                  type="text" 
                  value={editFormData.section || ''} 
                  onChange={(e) => setEditFormData({...editFormData, section: e.target.value})}
                  placeholder="Enter section name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current section: {editFormData.section || 'Not set'}
                </p>
              </div>
            </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 bg-red-800 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREDENTIALS MODAL */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6 text-red-800">Teacher Credentials</h3>
            
            {credentialsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Fetching teacher credentials...</p>
              </div>
            ) : selectedTeacher ? (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher Name</label>
                  <p className="text-lg font-bold text-gray-900">{selectedTeacher.firstName} {selectedTeacher.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                    <p className="text-lg font-mono text-gray-900">{selectedTeacher.username}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTeacher.username);
                        toast.success('Username copied to clipboard');
                      }}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                    <p className="text-sm font-mono text-gray-900 break-all">{selectedTeacher.email}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTeacher.email);
                        toast.success('Email address copied to clipboard');
                      }}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                    <div className="flex-1">
                      <p className="text-lg font-mono text-gray-900">{selectedTeacher.plainPassword}</p>
                      {selectedTeacher.plainPassword && selectedTeacher.plainPassword.includes('XXXX') && (
                        <p className="text-xs text-amber-600 mt-1">⚠️ Estimated password pattern</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTeacher.plainPassword);
                        toast.success('Password copied to clipboard');
                      }}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 ml-2"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-100 border border-yellow-400 p-3 rounded mt-4">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Security Note:</strong> These credentials should be shared securely with the teacher. Keep them confidential.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No teacher data available</p>
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setSelectedTeacher(null);
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVES SECTION */}
      {showArchives && (
        <div className="mt-10">
          <div className="bg-white rounded-lg shadow p-6 mb-4 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-purple-800 mb-2">Archived Teachers</h3>
                <p className="text-sm text-gray-600">
                  These teacher accounts have been archived and will be permanently deleted after 30 days. 
                  You can restore accounts or permanently delete them before the automatic deletion.
                </p>
              </div>
              {archivedTeachers.length > 0 && (
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  {selectedArchivedTeachers.size > 0 && (
                    <button
                      onClick={handleBulkPermanentDelete}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
                    >
                      Delete Selected ({selectedArchivedTeachers.size})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (selectAllArchived) {
                        setSelectedArchivedTeachers(new Set());
                        setSelectAllArchived(false);
                      } else {
                        setSelectedArchivedTeachers(new Set(archivedTeachers.map(t => t.id)));
                        setSelectAllArchived(true);
                      }
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
                  >
                    {selectAllArchived ? 'Unselect All' : 'Select All'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {archivesLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">Loading archived teachers...</p>
            </div>
          ) : archivedTeachers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No archived teachers found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-purple-100 text-purple-800">
                    <tr>
                      <th className="p-3 border text-center">
                        <input
                          type="checkbox"
                          checked={selectAllArchived}
                          onChange={toggleSelectAllArchived}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 border font-semibold">Name</th>
                      <th className="p-3 border font-semibold">Email</th>
                      <th className="p-3 border font-semibold">Role</th>
                      <th className="p-3 border font-semibold">Archived Date</th>
                      <th className="p-3 border font-semibold">Days Until Deletion</th>
                      <th className="p-3 border font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedTeachers.map((teacher) => {
                      const archivedDate = new Date(teacher.archivedAt || teacher.archived_date);
                      const daysUntilDeletion = Math.max(0, 30 - Math.ceil((new Date() - archivedDate) / (1000 * 60 * 60 * 24)));
                      
                      return (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="p-3 border text-center">
                            <input
                              type="checkbox"
                              checked={selectedArchivedTeachers.has(teacher.id)}
                              onChange={() => handleSelectArchivedTeacher(teacher.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 border">
                            <span className="font-medium">
                              {teacher.firstName || teacher.first_name} {teacher.lastName || teacher.last_name}
                            </span>
                          </td>
                          <td className="p-3 border text-sm text-gray-600">{teacher.email}</td>
                          <td className="p-3 border">
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-800">
                              {teacher.role}
                            </span>
                          </td>
                          <td className="p-3 border text-sm">
                            {archivedDate.toLocaleDateString()}
                          </td>
                          <td className="p-3 border text-sm">
                            <span className={`font-semibold ${daysUntilDeletion <= 7 ? 'text-red-600' : daysUntilDeletion <= 14 ? 'text-orange-600' : 'text-green-600'}`}>
                              {daysUntilDeletion} days
                            </span>
                          </td>
                          <td className="p-3 border">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleRestoreTeacher(teacher.id)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="Restore Teacher"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(teacher.id)}
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                title="Permanent Delete"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && teacherToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a.75.75 0 00-.75.75v3.5c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75v-3.5A.75.75 0 0012 5zm0 10a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Archive Teacher</h3>
                <p className="text-sm text-gray-600 mt-1">This action will move the teacher account to archives.</p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm font-medium text-gray-900">
                  <strong>Teacher:</strong> {teacherToDelete.firstName || teacherToDelete.first_name} {teacherToDelete.lastName || teacherToDelete.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Email:</strong> {teacherToDelete.email}
                </p>
                <p className="text-sm text-orange-600 mt-2">
                  <strong>⚠️ Important:</strong> The account will be archived and permanently deleted after 30 days.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTeacherToDelete(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTeacher}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 font-medium"
              >
                Archive Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      <RestoreTeacherModal
        showRestoreModal={showRestoreModal}
        teacherToRestore={teacherToRestore}
        onConfirm={confirmRestoreTeacher}
        onCancel={() => {
          setShowRestoreModal(false);
          setTeacherToRestore(null);
        }}
      />

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      <PermanentDeleteTeacherModal
        showPermanentDeleteModal={showPermanentDeleteModal}
        teacherToPermanentDelete={teacherToPermanentDelete}
        onConfirm={confirmPermanentDelete}
        onCancel={() => {
          setShowPermanentDeleteModal(false);
          setTeacherToPermanentDelete(null);
        }}
      />
    </div>
  );
}

