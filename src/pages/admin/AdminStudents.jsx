import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { 
  AcademicCapIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  ArchiveBoxIcon,
  CheckIcon, 
  XMarkIcon, 
  QrCodeIcon, 
  EyeIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  KeyIcon
} from "@heroicons/react/24/solid";
import BulkImportModal from "../../components/modals/BulkImportModal";
import { useSchoolYear } from "../../context/SchoolYearContext";
import { API_BASE_URL } from "../../api/config";

// Helper functions for QR code URL handling
const getQRCodeUrl = (qrCode) => {
  if (!qrCode) return null;
  
  // If it's already a base64 data URL, use it directly
  if (qrCode.startsWith('data:image/')) {
    return qrCode;
  }
  
  // If it's a file path, convert to full URL
  if (qrCode.startsWith('/qrcodes/')) {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${qrCode}`;
  }
  
  // Otherwise return as-is (in case it's already a full URL)
  return qrCode;
};

const getAlternativeQRUrls = (qrCode) => {
  if (!qrCode) return [];
  
  // If it's a data URL, no alternatives needed
  if (qrCode.startsWith('data:image/')) {
    return [qrCode];
  }
  
  // For file paths, try different URL variations
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const filename = qrCode.split('/').pop();
  
  return [
    `${baseUrl}/qrcodes/${filename}`,
    `${baseUrl}${qrCode}`,
  ];
};

export default function AdminStudents() {
  const navigate = useNavigate();
  const { viewingSchoolYear, activeSchoolYear, isViewingLocked } = useSchoolYear();
  const maxBirthDate = new Date().toISOString().split('T')[0];
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [archivedSearchQuery, setArchivedSearchQuery] = useState('');
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archiveSubmittingId, setArchiveSubmittingId] = useState(null);
  const [restoreSubmittingId, setRestoreSubmittingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [studentCredentials, setStudentCredentials] = useState(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedK3Students, setSelectedK3Students] = useState(new Set());
  const [selectedG4to6Students, setSelectedG4to6Students] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllK3, setSelectAllK3] = useState(false);
  const [selectAllG4to6, setSelectAllG4to6] = useState(false);
  const [fetchPrevLoading, setFetchPrevLoading] = useState(false);
  const [showFetchPrevModal, setShowFetchPrevModal] = useState(false);
  const [prevCandidatesLoading, setPrevCandidatesLoading] = useState(false);
  const [prevCandidates, setPrevCandidates] = useState([]);
  const [selectedPrevIds, setSelectedPrevIds] = useState(new Set());
  const [prevMeta, setPrevMeta] = useState(null);

  const isViewOnly = isViewingLocked;
  const targetSchoolYearId = viewingSchoolYear?.id || activeSchoolYear?.id || '';

  const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const calculateAgeFromBirthDate = (birthDateValue) => {
    if (!birthDateValue) return '';
    const birthDate = new Date(`${birthDateValue}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 0 ? age : '';
  };

  // Fetch students from API
  useEffect(() => {
    fetchStudents();
  }, [targetSchoolYearId]);

  const fetchStudents = async () => {
    try {
      const schoolYearQuery = targetSchoolYearId ? `?schoolYearId=${encodeURIComponent(String(targetSchoolYearId))}` : '';
      // Try the new backend API first
      const response = await fetch(`${API_BASE_URL}/students${schoolYearQuery}`);
      if (response.ok) {
        const data = await response.json();
        const studentsArray = Array.isArray(data) ? data : data.data || [];
        console.log('Raw students data:', studentsArray);
        console.log('Number of students:', studentsArray.length);
        
        // Show all students except those with 'pending' or 'declined' status
        // This includes: 'approved', 'active', 'Active', and any other non-rejected status
        const validStudents = studentsArray.filter(student => {
          const status = student.status?.toLowerCase() || 'active';
          return status !== 'pending' && status !== 'declined' && status !== 'rejected';
        });
        console.log('Valid students:', validStudents.length);
        console.log('Valid students details:', validStudents);
        setStudents(validStudents);
      } else {
        toast('Could not fetch from new API, using empty list', { icon: '⚠️' });
        setStudents([]);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Error fetching students: ' + error.message);
      // Try alternative endpoint if primary fails
      try {
        const schoolYearQuery = targetSchoolYearId ? `?schoolYearId=${encodeURIComponent(String(targetSchoolYearId))}` : '';
        const altResponse = await fetch(`${API_BASE_URL}/students${schoolYearQuery}`);
        if (altResponse.ok) {
          const data = await altResponse.json();
          // Filter for valid (non-rejected) students
          const validStudents = Array.isArray(data) ? data.filter(student => {
            const status = student.status?.toLowerCase() || 'active';
            return status !== 'pending' && status !== 'declined' && status !== 'rejected';
          }) : [];
          setStudents(validStudents);
        } else {
          setStudents([]);
        }
      } catch (altError) {
        toast.error('Both APIs failed: ' + altError.message);
        setStudents([]);
      }
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'inactive') return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const loadArchivedStudents = async () => {
    try {
      setArchivedLoading(true);
      const response = await fetch(`${API_BASE_URL}/students/archived`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch archived students');
      }

      const archivedList = Array.isArray(payload?.data) ? payload.data : [];
      setArchivedStudents(archivedList);
      setShowArchivedModal(true);
    } catch (error) {
      toast.error(error.message || 'Failed to load archived students');
    } finally {
      setArchivedLoading(false);
    }
  };

  const handleArchiveStudent = async (student) => {
    const normalizedStatus = String(student?.status || '').trim().toLowerCase();
    if (normalizedStatus !== 'inactive') {
      toast.error('Set student status to Inactive first before archiving.');
      return;
    }

    const reason = window.prompt('Stop reason (Dropped / LOA / Repeater):', 'Dropped');
    if (reason === null) return;

    try {
      setArchiveSubmittingId(student.id);
      const response = await fetch(`${API_BASE_URL}/students/${student.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: String(reason || '').trim() || 'Stopped' })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to archive student');
      }

      toast.success('Student archived successfully.');
      await fetchStudents();
      if (showArchivedModal) await loadArchivedStudents();
    } catch (error) {
      toast.error(error.message || 'Failed to archive student');
    } finally {
      setArchiveSubmittingId(null);
    }
  };

  const handleRestoreArchivedStudent = async (student) => {
    const gradeLevel = window.prompt('Re-enroll grade level:', student.gradeLevel || 'Grade 1');
    if (gradeLevel === null) return;

    const section = window.prompt('Re-enroll section:', student.section || '');
    if (section === null) return;

    try {
      setRestoreSubmittingId(student.id);
      const response = await fetch(`${API_BASE_URL}/students/${student.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel: String(gradeLevel || '').trim(),
          section: String(section || '').trim(),
          schoolYearId: activeSchoolYear?.id || targetSchoolYearId || undefined
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to restore student');
      }

      toast.success('Archived student restored successfully.');
      await fetchStudents();
      await loadArchivedStudents();
    } catch (error) {
      toast.error(error.message || 'Failed to restore student');
    } finally {
      setRestoreSubmittingId(null);
    }
  };

  const filteredArchivedStudents = archivedStudents.filter((student) => {
    const term = archivedSearchQuery.trim().toLowerCase();
    if (!term) return true;
    return (
      String(student.fullName || '').toLowerCase().includes(term) ||
      String(student.lrn || '').toLowerCase().includes(term) ||
      String(student.stopReason || '').toLowerCase().includes(term) ||
      String(student.stoppedYear || '').toLowerCase().includes(term)
    );
  });

  const loadPrevPromotionCandidates = async () => {
    if (!targetSchoolYearId) {
      toast.error('No target school year selected.');
      return;
    }

    try {
      setPrevCandidatesLoading(true);

      const sectionsResponse = await fetch(
        `${API_BASE_URL}/sections?schoolYearId=${encodeURIComponent(String(targetSchoolYearId))}`
      );
      const sectionsPayload = await sectionsResponse.json().catch(() => ({}));
      const activeSections = Array.isArray(sectionsPayload?.data) ? sectionsPayload.data : [];
      if (!sectionsResponse.ok || activeSections.length === 0) {
        throw new Error('Set up active-year sections first before fetching students from previous year.');
      }

      const response = await fetch(
        `${API_BASE_URL}/students/previous-year-promotion-candidates?schoolYearId=${encodeURIComponent(String(targetSchoolYearId))}`
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to load previous year students');
      }

      const list = Array.isArray(payload?.data) ? payload.data : [];
      setPrevCandidates(list);
      setPrevMeta(payload?.meta || null);
      setSelectedPrevIds(new Set());
      setShowFetchPrevModal(true);
    } catch (error) {
      toast.error(error.message || 'Failed to load previous year students');
    } finally {
      setPrevCandidatesLoading(false);
    }
  };

  const togglePrevSelection = (studentId) => {
    setSelectedPrevIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAllPrev = () => {
    const selectableIds = prevCandidates
      .filter((student) => !student.alreadyFetched && !student.needsSectionSetup)
      .map((student) => student.id);

    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedPrevIds.has(id));
    setSelectedPrevIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const handleFetchFromPreviousYear = async () => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to fetch students.');
      return;
    }

    if (!targetSchoolYearId) {
      toast.error('No target school year selected.');
      return;
    }

    const ids = Array.from(selectedPrevIds);
    if (ids.length === 0) {
      toast.error('Select at least one student to fetch.');
      return;
    }

    try {
      setFetchPrevLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/students/fetch-from-previous?schoolYearId=${encodeURIComponent(String(targetSchoolYearId))}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch students from previous year');
      }

      const inserted = Number(payload?.data?.inserted || 0);
      const updated = Number(payload?.data?.updated || 0);
      const skipped = Number(payload?.data?.skipped || 0);
      const promoted = Number(payload?.data?.promotedInserted || 0);
      const retained = Number(payload?.data?.retainedInserted || 0);

      toast.success(`Fetch complete: ${inserted} added, ${updated} updated (${promoted} promoted, ${retained} retained), ${skipped} skipped.`);
      setShowFetchPrevModal(false);
      setSelectedPrevIds(new Set());
      await fetchStudents();
    } catch (error) {
      toast.error(error.message || 'Failed to fetch students from previous year');
    } finally {
      setFetchPrevLoading(false);
    }
  };

  // Filter K-3 students (created by admin)
  const k3Students = students.filter(s => {
    const grade = s.gradeLevel;
    console.log('Student:', s.firstName, s.lastName, 'Grade:', grade, 'Type:', typeof grade, 'Status:', s.status);
    
    // More flexible matching for K-3 grade levels
    const isK3 = grade && (
      grade === 'Kindergarten' || 
      grade === 'Grade 1' || 
      grade === 'Grade 2' || 
      grade === 'Grade 3' ||
      grade.includes('Kindergarten') ||
      grade.includes('Grade 1') ||
      grade.includes('Grade 2') ||
      grade.includes('Grade 3') ||
      grade.includes('Kinder') ||
      grade.includes('1') ||
      grade.includes('2') ||
      grade.includes('3')
    );
    
    console.log('Is K-3:', isK3, 'for', s.firstName, s.lastName);
    return isK3;
  });

  // Filter Grade 4-6 students (both pending and approved)
  const g4to6Students = students.filter(s => {
    // More flexible matching for grade levels
    const grade = s.gradeLevel;
    const isG4to6 = grade && (
      grade.includes('Grade 4') || 
      grade.includes('Grade 5') || 
      grade.includes('Grade 6') ||
      grade.includes('4') || 
      grade.includes('5') || 
      grade.includes('6')
    );
    
    // Log each student to debug
    if (s.firstName && (s.firstName.includes('ash') || s.firstName.includes('last'))) {
      console.log('Found target student:', s.firstName, s.lastName, 'Grade:', grade, 'Matches G4-6:', isG4to6);
    }
    
    return isG4to6;
  });

  // Get all unique sections across all loaded students (not only K-3)
  const allSections = [...new Set(students.map(s => s.section).filter(Boolean))];

  // Search and filter K-3 students
  const filteredK3Students = k3Students.filter(student => {
    const matchesSearch = searchQuery === '' || 
      (student.fullName && student.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.firstName && student.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lastName && student.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lrn && student.lrn.includes(searchQuery));
    
    const matchesSection = selectedSection === 'All' || student.section === selectedSection;
    
    return matchesSearch && matchesSection;
  });

  const filteredG4to6Students = g4to6Students.filter(student => {
    const matchesSearch = searchQuery === '' ||
      (student.fullName && student.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.firstName && student.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lastName && student.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lrn && student.lrn.includes(searchQuery));

    const matchesSection = selectedSection === 'All' || student.section === selectedSection;

    return matchesSearch && matchesSection;
  });

  // Helper function to group students by section
  const groupStudentsBySection = (studentsList) => {
    const grouped = {};
    studentsList.forEach(student => {
      const sectionKey = `${student.gradeLevel}-${student.section}`;
      if (!grouped[sectionKey]) {
        grouped[sectionKey] = {
          grade: student.gradeLevel,
          section: student.section,
          students: []
        };
      }
      grouped[sectionKey].students.push(student);
    });
    
    // Sort by grade (K, 1, 2, 3) and then by section
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => {
        const gradeOrder = { 'Kindergarten': 0, 'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3 };
        const gradeA = gradeOrder[a[1].grade] ?? 999;
        const gradeB = gradeOrder[b[1].grade] ?? 999;
        if (gradeA !== gradeB) return gradeA - gradeB;
        return a[1].section.localeCompare(b[1].section);
      })
    );
  };

  // VIEW QR CODE
  const handleViewQR = (student) => {
    setSelectedStudent(student);
    setShowQRModal(true);
  };

  // EDIT STUDENT
  const handleEdit = (student) => {
        if (isViewOnly) {
          toast.error('Previous school years are view-only. Switch to the active year to edit.');
          return;
        }
    const normalizedStatus = String(student.status || '').trim().toLowerCase();
    const statusForEdit = normalizedStatus === 'inactive' ? 'inactive' : 'Active';
    const birthDateValue = toDateInputValue(student.birthDate || student.birth_date);
    const computedAge = calculateAgeFromBirthDate(birthDateValue);
    setSelectedStudent(student);
    setEditFormData({
      ...student,
      status: statusForEdit,
      birthDate: birthDateValue,
      age: computedAge !== '' ? computedAge : (student.age || '')
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    try {
      const actor = JSON.parse(localStorage.getItem('user') || '{}');
      const actorRole = String(actor?.role || 'admin').toLowerCase();
      const actorId = actor?.id ? String(actor.id) : null;
      const statusPayload = String(editFormData.status || 'Active').trim().toLowerCase() === 'inactive'
        ? 'inactive'
        : 'Active';

      // Create the update data object with all fields
      const updateData = {
        lrn: editFormData.lrn,
        firstName: editFormData.firstName,
        middleName: editFormData.middleName,
        lastName: editFormData.lastName,
        birthDate: editFormData.birthDate || null,
        age: editFormData.age,
        gradeLevel: editFormData.gradeLevel,
        section: editFormData.section,
        sex: editFormData.sex,
        parentFirstName: editFormData.parentFirstName,
        parentLastName: editFormData.parentLastName,
        parentEmail: editFormData.parentEmail,
        parentContact: editFormData.parentContact,
        // Include other existing fields that might be needed
        email: editFormData.email,
        username: editFormData.username,
        status: statusPayload,
        actorRole,
        actorId
      };

      const response = await fetch(`${API_BASE_URL}/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success('Student updated successfully!');
        fetchStudents(); // Refresh list
        setShowEditModal(false);
      } else {
        toast.error('Failed to update student: ' + response.statusText);
      }
    } catch (error) {
      toast.error('Error updating student: ' + error.message);
      toast.error('Failed to update student');
    }
  };

  // DELETE STUDENT
  const handleDelete = (studentId) => {
        if (isViewOnly) {
          toast.error('Previous school years are view-only. Switch to the active year to delete.');
          return;
        }
    const student = students.find(s => s.id === studentId);
    if (student) {
      setStudentToDelete(student);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Student deleted successfully!');
        fetchStudents(); // Refresh list
        setShowDeleteModal(false);
        setStudentToDelete(null);
      } else {
        toast.error('Failed to delete student: ' + response.statusText);
      }
    } catch (error) {
      toast.error('Error deleting student: ' + error.message);
      toast.error('Failed to delete student');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };

  // VIEW DETAILS
  const handleView = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  // DOWNLOAD QR CODE
  const handleDownloadQR = (student) => {
    const link = document.createElement('a');
    const qrUrl = getQRCodeUrl(student.qrCode);
    
    link.href = qrUrl;
    link.download = `QR_${student.lrn}_${student.fullName}.png`;
    link.click();
  };

  // VIEW CREDENTIALS
  const handleViewCredentials = async (student) => {
    setSelectedStudent(student);
    setLoadingCredentials(true);
    
    try {
      // Fetch student credentials from API
      const response = await fetch(`${API_BASE_URL}/students/${student.id}/credentials`);
      
      if (response.ok) {
        const credentialsData = await response.json();
        setStudentCredentials(credentialsData);
        setShowCredentialsModal(true);
      } else {
        // Determine the correct password based on account creation method
        let passwordToShow = student.plainPassword || student.password;
        
        // If no password from student data, determine based on account creation patterns
        if (!passwordToShow) {
          // Check if this looks like a bulk imported account
          // Bulk imported accounts typically have LRN-based usernames and the default password
          if (student.username && student.username.includes('@wmsu.edu.ph') && student.lrn) {
            passwordToShow = 'Password123'; // Default for bulk imports
            console.log('Detected bulk imported student:', student.username);
          } else {
            // For individually created accounts, use AdminCreateK6 pattern
            if (student.lrn) {
              // Generate password using AdminCreateK6 pattern: WMSU{last4LRN}0000
              const last4LRN = student.lrn.slice(-4).padStart(4, '0');
              passwordToShow = `WMSU${last4LRN}0000`;
              console.log('Detected individually created student, exact password:', passwordToShow);
            } else {
              passwordToShow = 'Password123'; // Final fallback
              console.log('Using fallback password for student:', student.lrn);
            }
          }
        }
        
        // Generate email from first and last name (like bulk import)
        const firstName = student.firstName.toLowerCase().replace(/\s+/g, '');
        const lastName = student.lastName.toLowerCase().replace(/\s+/g, '');
        const generatedEmail = `${firstName}.${lastName}@wmsu.edu.ph`;
        
        setStudentCredentials({
          email: generatedEmail, // Use generated email from name
          password: passwordToShow,
          username: student.username || `${student.firstName}.${student.lastName}`.toLowerCase() || `${student.lrn}@wmsu.edu.ph` // Use generated username for individual, LRN for bulk
        });
        setShowCredentialsModal(true);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
      // Determine the correct password based on account creation method
      let passwordToShow = student.plainPassword || student.password;
      
      // If no password from student data, determine based on account creation patterns
      if (!passwordToShow) {
        // Check if this looks like a bulk imported account
        if (student.username && student.username.includes('@wmsu.edu.ph') && student.lrn) {
          passwordToShow = 'Password123'; // Default for bulk imports
          console.log('Error fallback - Detected bulk imported student:', student.username);
        } else {
          // For individually created accounts, use AdminCreateK6 pattern
          if (student.lrn) {
            // Generate password using AdminCreateK6 pattern: WMSU{last4LRN}0000
            const last4LRN = student.lrn.slice(-4).padStart(4, '0');
            passwordToShow = `WMSU${last4LRN}0000`;
            console.log('Error fallback - Detected individually created student, exact password:', passwordToShow);
          } else {
            passwordToShow = 'Password123'; // Final fallback
            console.log('Error fallback - Using fallback password for student:', student.lrn);
          }
        }
      }
      
      // Generate email from first and last name (like bulk import)
      const firstName = student.firstName.toLowerCase().replace(/\s+/g, '');
      const lastName = student.lastName.toLowerCase().replace(/\s+/g, '');
      const generatedEmail = `${firstName}.${lastName}@wmsu.edu.ph`;
      
      setStudentCredentials({
        email: generatedEmail, // Use generated email from name
        password: passwordToShow,
        username: student.username || `${student.firstName}.${student.lastName}`.toLowerCase() || `${student.lrn}@wmsu.edu.ph` // Use generated username for individual, LRN for bulk
      });
      setShowCredentialsModal(true);
    } finally {
      setLoadingCredentials(false);
    }
  };

  // TOGGLE K-3 STUDENT SELECTION
  const toggleK3StudentSelection = (studentId) => {
    const newSelection = new Set(selectedK3Students);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedK3Students(newSelection);

    // Update main selectAll state (both tables must be fully selected)
    const allK3Selected = filteredK3Students.every(s => newSelection.has(s.id));
    const allG4to6Selected = filteredG4to6Students.every(s => selectedG4to6Students.has(s.id));
    setSelectAll(allK3Selected && allG4to6Selected);
    
    // NOTE: Don't update selectAllK3 here to prevent individual 
    // checkboxes from triggering table's "Select All" checkbox
  };

  // TOGGLE GRADE 4-6 STUDENT SELECTION
  const toggleG4to6StudentSelection = (studentId) => {
    const newSelection = new Set(selectedG4to6Students);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedG4to6Students(newSelection);

    // Update main selectAll state (both tables must be fully selected)
    const allK3Selected = filteredK3Students.every(s => selectedK3Students.has(s.id));
    const allG4to6Selected = filteredG4to6Students.every(s => newSelection.has(s.id));
    setSelectAll(allK3Selected && allG4to6Selected);
    
    // NOTE: Don't update selectAllG4to6 here to prevent individual 
    // checkboxes from triggering table's "Select All" checkbox
  };

  // Keep original handler for backward compatibility
  const toggleStudentSelection = (studentId) => {
    const student = [...filteredK3Students, ...filteredG4to6Students].find(s => s.id === studentId);
    if (filteredK3Students.some(s => s.id === studentId)) {
      toggleK3StudentSelection(studentId);
    } else if (filteredG4to6Students.some(s => s.id === studentId)) {
      toggleG4to6StudentSelection(studentId);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      // Unselect all students from both tables
      setSelectedK3Students(new Set());
      setSelectedG4to6Students(new Set());
      setSelectAllK3(false);
      setSelectAllG4to6(false);
      setSelectAll(false);
    } else {
      // Select all students from both tables
      setSelectedK3Students(new Set(filteredK3Students.map(s => s.id)));
      setSelectedG4to6Students(new Set(filteredG4to6Students.map(s => s.id)));
      setSelectAllK3(true);
      setSelectAllG4to6(true);
      setSelectAll(true);
    }
  };

  const toggleSelectAllK3 = (sectionStudentIds = null) => {
    const idsToToggle = sectionStudentIds || filteredK3Students.map(s => s.id);
    const allSelectedInScope = idsToToggle.every(id => selectedK3Students.has(id));

    if (allSelectedInScope) {
      // Unselect students within scope
      setSelectedK3Students(prev => new Set([...prev].filter(id => !idsToToggle.includes(id))));
      setSelectAllK3(false);
    } else {
      // Select students within scope
      setSelectedK3Students(prev => new Set([...prev, ...idsToToggle]));
      setSelectAllK3(true);
    }
    
    // Update main selectAll state (both tables must be fully selected)
    const allG4to6Selected = filteredG4to6Students.length > 0 && filteredG4to6Students.every(s => selectedG4to6Students.has(s.id));
    const allK3Selected = filteredK3Students.length > 0 && filteredK3Students.every(s => selectedK3Students.has(s.id));
    setSelectAll(allK3Selected && allG4to6Selected);
  };

  const toggleSelectAllG4to6 = (sectionStudentIds = null) => {
    const idsToToggle = sectionStudentIds || filteredG4to6Students.map(s => s.id);
    const allSelectedInScope = idsToToggle.every(id => selectedG4to6Students.has(id));

    if (allSelectedInScope) {
      // Unselect students within scope
      setSelectedG4to6Students(prev => new Set([...prev].filter(id => !idsToToggle.includes(id))));
      setSelectAllG4to6(false);
    } else {
      // Select students within scope
      setSelectedG4to6Students(prev => new Set([...prev, ...idsToToggle]));
      setSelectAllG4to6(true);
    }
    
    // Update main selectAll state (both tables must be fully selected)
    const allK3Selected = filteredK3Students.length > 0 && filteredK3Students.every(s => selectedK3Students.has(s.id));
    const allG4to6Selected = filteredG4to6Students.length > 0 && filteredG4to6Students.every(s => selectedG4to6Students.has(s.id));
    setSelectAll(allK3Selected && allG4to6Selected);
  };

  // BULK DELETE
  const handleBulkDelete = async () => {
    // Combine all selected students from both tables
    const allSelectedStudents = new Set([...selectedK3Students, ...selectedG4to6Students]);
    
    if (allSelectedStudents.size === 0) {
      toast.error('Please select students to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${allSelectedStudents.size} student(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const studentId of allSelectedStudents) {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          successCount++;
        }
      }
      toast.success(`Successfully deleted ${successCount} student(s)`);
      // Clear all selections
      setSelectedK3Students(new Set());
      setSelectedG4to6Students(new Set());
      setSelectAllK3(false);
      setSelectAllG4to6(false);
      setSelectAll(false);
      fetchStudents();
    } catch (error) {
      toast.error('Error deleting students: ' + error.message);
      toast.error('Error deleting students');
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <AcademicCapIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Students Management</h2>
        </div>
      </div>

      <p className="text-gray-600">
        Manage student records, verify accounts, and generate QR codes.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Total Students</h3>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800">Kinder - Grade 3 Students</h3>
          <p className="text-2xl font-bold">{k3Students.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
          <h3 className="text-lg font-semibold text-green-800">Grade 4 - 6 Students</h3>
          <p className="text-2xl font-bold">{g4to6Students.length}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-red-800 mb-2">Student Actions</h3>
        <ul className="list-disc ml-5 text-gray-700 space-y-1">
          <li>Create accounts for Kinder–Grade 6</li>
          <li>Edit student details</li>
          <li>Delete student accounts</li>
          <li>Regenerate or download QR codes</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={loadPrevPromotionCandidates}
          disabled={isViewOnly || prevCandidatesLoading}
          className={`px-5 py-2 rounded-lg transition flex items-center gap-2 ${isViewOnly || prevCandidatesLoading ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <ArrowPathIcon className={`w-5 h-5 ${prevCandidatesLoading ? 'animate-spin' : ''}`} />
          {prevCandidatesLoading ? 'Loading...' : 'Fetch from Prev Year'}
        </button>
        <button
          onClick={() => setShowBulkImportModal(true)}
          disabled={isViewOnly}
          className={`px-5 py-2 rounded-lg transition flex items-center gap-2 ${isViewOnly ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          <ArrowUpTrayIcon className="w-5 h-5" />
          Bulk Import (CSV)
        </button>
        <button
          onClick={() => navigate("/admin/admin/create-k6")}
          disabled={isViewOnly}
          className={`px-5 py-2 rounded-lg transition ${isViewOnly ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-red-800 text-white hover:bg-red-700'}`}
        >
          + Create Individual Account
        </button>
        <button
          onClick={loadArchivedStudents}
          disabled={archivedLoading}
          className={`px-5 py-2 rounded-lg transition flex items-center gap-2 ${archivedLoading ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
        >
          <ArchiveBoxIcon className={`w-5 h-5 ${archivedLoading ? 'animate-spin' : ''}`} />
          {archivedLoading ? 'Loading...' : 'Archived Students'}
        </button>
      </div>

      {/* KINDER TO GRADE 3 STUDENTS TABLE */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-800">
            Kinder to Grade 3 Students (Admin Created) - {filteredK3Students.length} students
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              {[...selectedK3Students, ...selectedG4to6Students].size > 0 
                ? `Selected: ${[...selectedK3Students, ...selectedG4to6Students].size} / ${filteredK3Students.length + filteredG4to6Students.length}` 
                : `Total: ${filteredK3Students.length + filteredG4to6Students.length}`
              }
            </div>
            {[...selectedK3Students, ...selectedG4to6Students].size > 0 ? (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
              >
                Delete {[...selectedK3Students, ...selectedG4to6Students].size} Selected
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSelectAllK3()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  {selectAllK3 ? 'Unselect All K-3' : 'Select All K-3'}
                </button>
                <button
                  onClick={() => toggleSelectAllG4to6()}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                >
                  {selectAllG4to6 ? 'Unselect All G4 - 6' : 'Select All G4 - 6'}
                </button>
                <button
                  onClick={toggleSelectAll}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
                >
                  {selectAll ? 'Unselect All' : 'Select All'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name or LRN</label>
              <input
                type="text"
                placeholder="Enter student name or LRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
              >
                <option value="All">All Sections</option>
                {allSections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Info */}
          {(searchQuery || selectedSection !== 'All') && (
            <div className="text-sm text-gray-600">
              {searchQuery && <span>Searching for "{searchQuery}" </span>}
              {selectedSection !== 'All' && <span>Section: {selectedSection} </span>}
              <span className="font-semibold">{filteredK3Students.length + filteredG4to6Students.length} result{(filteredK3Students.length + filteredG4to6Students.length) !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* K-3 STUDENTS TABLE - GROUPED BY SECTION */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              Kinder - Grade 3 Students ({filteredK3Students.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading students...
            </div>
          ) : filteredK3Students.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchQuery || selectedSection !== 'All' 
                ? 'No K-3 students match your search criteria.'
                : 'No K-3 students found. Create your first student account!'}
            </div>
          ) : (
            Object.entries(groupStudentsBySection(filteredK3Students)).map(([sectionKey, { grade, section, students: sectionStudents }]) => (
              <div key={sectionKey} className="mb-0">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                  <h4 className="text-md font-semibold text-blue-700">
                    {grade} - {section} ({sectionStudents.length})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-blue-100 text-blue-800">
                      <tr>
                        <th className="p-3 border text-center">
                          <input
                            type="checkbox"
                            checked={sectionStudents.length > 0 && sectionStudents.every(s => selectedK3Students.has(s.id))}
                            onChange={() => toggleSelectAllK3(sectionStudents.map(s => s.id))}
                            className="w-4 h-4 cursor-pointer"
                            title="Select {grade} - {section} students"
                          />
                        </th>
                        <th className="p-3 border">LRN</th>
                        <th className="p-3 border">Name</th>
                        <th className="p-3 border">Sex</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">QR</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="p-3 border text-center">
                            <input
                              type="checkbox"
                              checked={selectedK3Students.has(student.id)}
                              onChange={() => {
                                console.log('K-3 Individual checkbox clicked:', student.id, 'Currently selected:', selectedK3Students.has(student.id));
                                toggleK3StudentSelection(student.id);
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 border">{student.lrn}</td>
                          <td className="p-3 border font-semibold">
                            {student.fullName || `${student.firstName} ${student.lastName}` || 'N/A'}
                          </td>
                          <td className="p-3 border">{student.sex || 'N/A'}</td>
                          <td className="p-3 border">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(student.status)}`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="p-3 border text-center">
                            <div className="flex justify-center items-center">
                              <button 
                                onClick={() => handleViewQR(student)}
                                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-1"
                              >
                                <QrCodeIcon className="w-5 h-5" /> View
                              </button>
                            </div>
                          </td>
                          <td className="p-3 border w-40">
                            <div className="flex gap-2 justify-center items-center">
                              <button 
                                onClick={() => handleEdit(student)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                title="Edit Student"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </button>

                              <button
                                onClick={() => handleDelete(student.id)}
                                className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                title="Delete Student"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>

                              <button
                                onClick={() => handleArchiveStudent(student)}
                                disabled={archiveSubmittingId === student.id}
                                className="p-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Archive Student"
                              >
                                <ArchiveBoxIcon className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={() => handleView(student)}
                                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                title="View Details"
                              >
                                <EyeIcon className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={() => handleViewCredentials(student)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="View Credentials"
                              >
                                <KeyIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* GRADE 4-6 STUDENTS TABLE - GROUPED BY SECTION */}
      <div className="mt-10">
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-green-800 mb-4">
                Grade 4-6 Students ({filteredG4to6Students.length})
              </h3>
            </div>
            
            {loading ? (
              <div className="p-6 text-center text-gray-500">
                Loading students...
              </div>
            ) : filteredG4to6Students.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {searchQuery || selectedSection !== 'All'
                  ? 'No Grade 4-6 students match your search criteria.'
                  : 'No Grade 4-6 students found.'}
              </div>
            ) : (
              Object.entries(groupStudentsBySection(filteredG4to6Students)).map(([sectionKey, { grade, section, students: sectionStudents }]) => (
                <div key={sectionKey} className="mb-0">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                    <h4 className="text-md font-semibold text-green-700">
                      {grade} - {section} ({sectionStudents.length})
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-green-100 text-green-800">
                        <tr>
                          <th className="p-3 border text-center">
                            <input
                              type="checkbox"
                              checked={sectionStudents.length > 0 && sectionStudents.every(s => selectedG4to6Students.has(s.id))}
                              onChange={() => toggleSelectAllG4to6(sectionStudents.map(s => s.id))}
                              className="w-4 h-4 cursor-pointer"
                              title="Select {grade} - {section} students"
                            />
                          </th>
                          <th className="p-3 border">LRN</th>
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Sex</th>
                          <th className="p-3 border">Status</th>
                          <th className="p-3 border">QR</th>
                          <th className="p-3 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="p-3 border text-center">
                              <input
                                type="checkbox"
                                checked={selectedG4to6Students.has(student.id)}
                                onChange={() => {
                                  console.log('G4-6 Individual checkbox clicked:', student.id, 'Currently selected:', selectedG4to6Students.has(student.id));
                                  toggleG4to6StudentSelection(student.id);
                                }}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 border">{student.lrn}</td>
                            <td className="p-3 border font-semibold">
                              {student.fullName || `${student.firstName} ${student.lastName}` || 'N/A'}
                            </td>
                            <td className="p-3 border">{student.sex || 'N/A'}</td>
                            <td className="p-3 border">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(student.status)}`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="p-3 border text-center">
                              <div className="flex justify-center items-center">
                                <button 
                                  onClick={() => handleViewQR(student)}
                                  className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-1"
                                >
                                  <QrCodeIcon className="w-5 h-5" /> View
                                </button>
                              </div>
                            </td>
                            <td className="p-3 border w-40">
                              <div className="flex gap-2 justify-center items-center">
                                <button 
                                  onClick={() => handleEdit(student)}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                  title="Edit Student"
                                >
                                  <PencilSquareIcon className="w-5 h-5" />
                                </button>

                                <button
                                  onClick={() => handleDelete(student.id)}
                                  className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                  title="Delete Student"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>

                                <button
                                  onClick={() => handleArchiveStudent(student)}
                                  disabled={archiveSubmittingId === student.id}
                                  className="p-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Archive Student"
                                >
                                  <ArchiveBoxIcon className="w-5 h-5" />
                                </button>

                                <button 
                                  onClick={() => handleView(student)}
                                  className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                  title="View Details"
                                >
                                  <EyeIcon className="w-5 h-5" />
                                </button>

                                <button 
                                  onClick={() => handleViewCredentials(student)}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                  title="View Credentials"
                                >
                                  <KeyIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fetch From Previous Year Modal */}
      {showFetchPrevModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Fetch Promoted/Retained Students</h3>
                <p className="text-sm text-gray-600">
                  Source: {prevMeta?.sourceSchoolYearLabel || 'Previous School Year'}
                </p>
              </div>
              <button
                onClick={() => setShowFetchPrevModal(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[58vh]">
              {prevCandidatesLoading ? (
                <div className="py-10 text-center text-gray-500">Loading candidates...</div>
              ) : prevCandidates.length === 0 ? (
                <div className="py-10 text-center text-gray-500">No promoted/retained students found from previous school year.</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedPrevIds.size} selected / {prevCandidates.filter((student) => !student.alreadyFetched && !student.needsSectionSetup).length} available
                    </div>
                    <button
                      onClick={toggleSelectAllPrev}
                      className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Select All Available
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="p-3 border text-center w-16">Pick</th>
                          <th className="p-3 border">LRN</th>
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Movement</th>
                          <th className="p-3 border">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prevCandidates.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="p-3 border text-center">
                              <input
                                type="checkbox"
                                disabled={student.alreadyFetched || student.needsSectionSetup}
                                checked={selectedPrevIds.has(student.id)}
                                onChange={() => togglePrevSelection(student.id)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="p-3 border">{student.lrn}</td>
                            <td className="p-3 border font-medium">{student.fullName}</td>
                            <td className="p-3 border">
                              {student.fromGrade} {student.fromSection ? `- ${student.fromSection}` : ''} {' -> '}
                              {student.toGrade || '-'} {student.toSection ? `- ${student.toSection}` : ''}
                            </td>
                            <td className="p-3 border">
                              {student.alreadyFetched ? (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">Already Fetched</span>
                              ) : student.needsSectionSetup ? (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Needs Section Setup</span>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'promoted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {student.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowFetchPrevModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleFetchFromPreviousYear}
                disabled={fetchPrevLoading || selectedPrevIds.size === 0}
                className={`px-4 py-2 rounded-lg text-white ${fetchPrevLoading || selectedPrevIds.size === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {fetchPrevLoading ? 'Fetching...' : `Fetch Selected (${selectedPrevIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVED STUDENTS MODAL */}
      {showArchivedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[88vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Archived Students</h3>
                <p className="text-sm text-gray-600">Inactive students can be restored anytime, even after multiple school years.</p>
              </div>
              <button
                onClick={() => setShowArchivedModal(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search archived by name, LRN, reason, or stopped year..."
                value={archivedSearchQuery}
                onChange={(e) => setArchivedSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="p-5 overflow-y-auto max-h-[56vh]">
              {archivedLoading ? (
                <div className="py-10 text-center text-gray-500">Loading archived students...</div>
              ) : filteredArchivedStudents.length === 0 ? (
                <div className="py-10 text-center text-gray-500">No archived students found.</div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-3 border">LRN</th>
                        <th className="p-3 border">Name</th>
                        <th className="p-3 border">Last Grade/Section</th>
                        <th className="p-3 border">Stopped Year</th>
                        <th className="p-3 border">Reason</th>
                        <th className="p-3 border text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchivedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="p-3 border">{student.lrn}</td>
                          <td className="p-3 border font-medium">{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                          <td className="p-3 border">{student.gradeLevel || '-'} {student.section ? `- ${student.section}` : ''}</td>
                          <td className="p-3 border">{student.stoppedYear || student.schoolYearLabel || '-'}</td>
                          <td className="p-3 border">{student.stopReason || '-'}</td>
                          <td className="p-3 border text-center">
                            <button
                              onClick={() => handleRestoreArchivedStudent(student)}
                              disabled={restoreSubmittingId === student.id}
                              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {restoreSubmittingId === student.id ? 'Restoring...' : 'Restore'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowArchivedModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
                
      {/* QR CODE MODAL */}
      {showQRModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">QR Code - {selectedStudent.fullName}</h3>
            <div className="flex justify-center mb-4">
              {selectedStudent.qrCode ? (
                <img 
                  src={getQRCodeUrl(selectedStudent.qrCode)}
                  alt="QR Code" 
                  className="w-64 h-64 border-4 border-gray-300 rounded-lg"
                  onError={(e) => {
                    console.error('QR Code load error. File path:', selectedStudent.qrCode);
                    console.error('Attempted URL:', e.target.src);
                    
                    // Try the exact database path if static route fails
                    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                    const fallbackUrl = `${baseUrl}${selectedStudent.qrCode}`;
                    
                    if (e.target.src !== fallbackUrl) {
                      console.log('Trying fallback path:', fallbackUrl);
                      e.target.src = fallbackUrl;
                      return;
                    }
                    
                    // If fallback fails, show fallback immediately
                    console.warn('QR code not available, showing fallback');
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22256%22 height=%22256%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22256%22 height=%22256%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%236b7280%22%3EQR Code%3C/text%3E%3Ctext x=%2250%25%22 y=%2260%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22%239ca3af%22%3ENot Available%3C/text%3E%3C/svg%3E';
                  }}
                  onLoad={() => {
                    console.log('QR Code loaded successfully from:', selectedStudent.qrCode);
                  }}
                />
              ) : (
                <div className="w-64 h-64 border-4 border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No QR Code Available</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-gray-600 mb-4">LRN: {selectedStudent.lrn}</p>
            <div className="flex gap-3">
              {selectedStudent.qrCode && (
                <button
                  onClick={() => handleDownloadQR(selectedStudent)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Download QR
                </button>
              )}
              <button
                onClick={() => setShowQRModal(false)}
                className={selectedStudent.qrCode ? 'flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600' : 'w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto hide-scrollbar">
            <h3 className="text-xl font-bold mb-4">Edit Student - {selectedStudent.fullName}</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">LRN</label>
                <input
                  type="text"
                  value={editFormData.lrn || ''}
                  onChange={(e) => setEditFormData({...editFormData, lrn: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                  placeholder="e.g., 123456789012"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">First Name</label>
                <input
                  type="text"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Middle Name</label>
                <input
                  type="text"
                  value={editFormData.middleName || ''}
                  onChange={(e) => setEditFormData({...editFormData, middleName: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                  placeholder="e.g., Juan"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Birthday</label>
                <input
                  type="date"
                  value={editFormData.birthDate || ''}
                  onChange={(e) => {
                    const nextBirthDate = e.target.value;
                    const nextAge = calculateAgeFromBirthDate(nextBirthDate);
                    setEditFormData({
                      ...editFormData,
                      birthDate: nextBirthDate,
                      age: nextAge !== '' ? nextAge : editFormData.age
                    });
                  }}
                  className="w-full border p-2 rounded-lg"
                  max={maxBirthDate}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Age</label>
                <input
                  type="number"
                  value={editFormData.age || ''}
                  onChange={(e) => setEditFormData({...editFormData, age: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                  placeholder="e.g., 12"
                  min="6"
                  max="18"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Grade Level</label>
                <select
                  value={editFormData.gradeLevel || ''}
                  onChange={(e) => setEditFormData({...editFormData, gradeLevel: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="">Select Grade Level</option>
                  <option value="Kinder">Kinder</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Section</label>
                <input
                  type="text"
                  value={editFormData.section}
                  onChange={(e) => setEditFormData({...editFormData, section: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Sex</label>
                <select
                  value={editFormData.sex || ''}
                  onChange={(e) => setEditFormData({...editFormData, sex: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Account Status</label>
                <select
                  value={editFormData.status || 'Active'}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="Active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Inactive students cannot login. Admin can set them back to Active when they return.</p>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-bold text-red-800 mb-3">📧 Parent/Guardian Contact Info</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">Parent First Name</label>
                    <input
                      type="text"
                      value={editFormData.parentFirstName || ''}
                      onChange={(e) => setEditFormData({...editFormData, parentFirstName: e.target.value})}
                      placeholder="e.g., Juan"
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Parent Last Name</label>
                    <input
                      type="text"
                      value={editFormData.parentLastName || ''}
                      onChange={(e) => setEditFormData({...editFormData, parentLastName: e.target.value})}
                      placeholder="e.g., Santos"
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Parent/Guardian Email</label>
                    <input
                      type="email"
                      value={editFormData.parentEmail || ''}
                      onChange={(e) => setEditFormData({...editFormData, parentEmail: e.target.value})}
                      placeholder="e.g., parent@gmail.com"
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Parent/Guardian Contact Number</label>
                    <input
                      type="text"
                      value={editFormData.parentContact || ''}
                      onChange={(e) => setEditFormData({...editFormData, parentContact: e.target.value})}
                      placeholder="e.g., 09171234567"
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateStudent}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar">
            {/* Profile Picture at Top Center */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {selectedStudent.profileImage ? (
                  <img
                    src={
                      selectedStudent.profileImage.startsWith('http')
                        ? selectedStudent.profileImage
                        : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${selectedStudent.profileImage}`
                    }
                    alt="Student Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-red-700"
                    onError={(e) => {
                      e.target.src = '/default-avatar.jpeg';
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-red-700 flex items-center justify-center">
                    <span className="text-3xl text-gray-500 font-bold">
                      {selectedStudent.firstName?.charAt(0) || selectedStudent.fullName?.charAt(0) || 'S'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold mb-6 text-center">Student Details</h3>
            
            {/* Student Information Section */}
            <div className="border-2 border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-lg mb-4 text-red-800">Student Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">LRN</p>
                  <p className="font-semibold">{selectedStudent.lrn || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">First Name</p>
                  <p className="font-semibold">{selectedStudent.firstName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Middle Name</p>
                  <p className="font-semibold">{selectedStudent.middleName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Last Name</p>
                  <p className="font-semibold">{selectedStudent.lastName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Age</p>
                  <p className="font-semibold">{selectedStudent.age || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Sex</p>
                  <p className="font-semibold">{selectedStudent.sex || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Grade Level</p>
                  <p className="font-semibold">{selectedStudent.gradeLevel || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Section</p>
                  <p className="font-semibold">{selectedStudent.section || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Parent Information Section */}
            <div className="border-2 border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-lg mb-4 text-red-800">Parent/Guardian Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Parent First Name</p>
                  <p className="font-semibold">{selectedStudent.parentFirstName || selectedStudent.parentName?.split(' ')[0] || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Parent Last Name</p>
                  <p className="font-semibold">{selectedStudent.parentLastName || selectedStudent.parentName?.split(' ').slice(-1)[0] || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Contact Number</p>
                  <p className="font-semibold">{selectedStudent.parentContact || selectedStudent.contactNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Email Address</p>
                  <p className="font-semibold">{selectedStudent.parentEmail || selectedStudent.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowViewModal(false)}
              className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CREDENTIALS MODAL */}
      {showCredentialsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6 text-red-800">Student Credentials</h3>
            
            {loadingCredentials ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800"></div>
                <span className="ml-3 text-gray-600">Loading credentials...</span>
              </div>
            ) : (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name</label>
                  <p className="text-lg font-bold text-gray-900">{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                </div>
                
                {/* LRN - Primary login identifier */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">LRN (Use this to login)</label>
                  <div className="flex items-center justify-between bg-white p-3 rounded border-2 border-green-500">
                    <p className="text-lg font-mono font-bold text-green-700 flex-1 mr-2">{selectedStudent.lrn || studentCredentials?.lrn || 'N/A'}</p>
                    <button
                      onClick={() => {
                        const lrn = selectedStudent.lrn || studentCredentials?.lrn;
                        navigator.clipboard.writeText(lrn);
                        toast.success('LRN copied to clipboard!');
                      }}
                      className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                    <p className="text-lg font-mono text-gray-900 flex-1 mr-2">{studentCredentials?.password || 'N/A'}</p>
                    <button
                      onClick={() => {
                        const password = studentCredentials?.password || '';
                        navigator.clipboard.writeText(password);
                        toast.success('Password copied to clipboard!');
                      }}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="bg-green-100 border border-green-400 p-3 rounded mt-4">
                  <p className="text-sm text-green-800">
                    <strong>📝 How to Login:</strong><br/>
                    Username: <span className="font-mono font-bold">{selectedStudent.lrn}</span><br/>
                    Password: <span className="font-mono font-bold">{studentCredentials?.password || 'Loading...'}</span>
                  </p>
                </div>
                
                <div className="bg-yellow-100 border border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Security Note:</strong> These credentials should be shared securely with the student's parents/guardians. Keep them confidential.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setStudentCredentials(null);
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && studentToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Student</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Student Information:</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Name:</span> {studentToDelete.fullName || `${studentToDelete.firstName} ${studentToDelete.lastName}`}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">LRN:</span> {studentToDelete.lrn}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Grade:</span> {studentToDelete.gradeLevel}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Section:</span> {studentToDelete.section}
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 p-3 rounded mb-6">
              <p className="text-sm text-red-800">
                <strong>⚠️ Warning:</strong> Deleting this student will permanently remove all their data including:
              </p>
              <ul className="text-xs text-red-700 mt-2 ml-4 list-disc">
                <li>Student records and information</li>
                <li>QR code access</li>
                <li>Login credentials</li>
                <li>Associated data</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      <BulkImportModal 
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchStudents(); // Refresh the students list
        }}
      />
    </div>
  );
}
