import React, { useState, useEffect } from "react";
import { 
  CalendarDaysIcon,
  PlusIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  TrashIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import { useSchoolYear } from "../../context/SchoolYearContext";
import GradesReportCard from "../../components/GradesReportCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Color palette for grade levels
const GRADE_COLORS = {
  'Kinder':  '#ec4899',
  'Grade 1': '#ef4444',
  'Grade 2': '#f97316',
  'Grade 3': '#eab308',
  'Grade 4': '#22c55e',
  'Grade 5': '#3b82f6',
  'Grade 6': '#8b5cf6',
  'Other':   '#6b7280'
};

export default function AdminSchoolYear() {
  const { viewingSchoolYear, setViewingSchoolYear, activeSchoolYear, setActiveSchoolYear } = useSchoolYear();
  
  const [schoolYears, setSchoolYears] = useState([]);
  const [archivedSchoolYears, setArchivedSchoolYears] = useState([]);
  const [studentsByGrade, setStudentsByGrade] = useState([]);
  const [promotionPreview, setPromotionPreview] = useState([]);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [promotionCandidates, setPromotionCandidates] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());
  const [classes, setClasses] = useState([]);
  const [selectedPromotionSchoolYearId, setSelectedPromotionSchoolYearId] = useState('');
  const [promotionAssignments, setPromotionAssignments] = useState({});
  const [historyGradeFilter, setHistoryGradeFilter] = useState('All Grades');
  const [historySectionFilter, setHistorySectionFilter] = useState('All Sections');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showArchivedList, setShowArchivedList] = useState(false);
  const [leadershipFetching, setLeadershipFetching] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    start_date: '',
    end_date: '',
    q1_end_date: '',
    q2_end_date: '',
    q3_end_date: '',
    q4_end_date: '',
    principal_name: '',
    assistant_principal_name: '',
    is_active: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportCardStudent, setReportCardStudent] = useState(null);

  // Normalize SY labels to dashed format (e.g., 20262027 -> 2026-2027)
  const formatSchoolYearLabel = (label = '') => {
    const clean = String(label).trim();
    if (!clean) return clean;
    if (clean.includes('-')) return clean;
    const digits = clean.replace(/\D/g, '');
    if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return clean;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [syRes, activeRes, gradeRes, previewRes, archivedRes, historyRes, candidatesRes, classesRes] = await Promise.allSettled([
        axios.get('/school-years'),
        axios.get('/school-years/active'),
        axios.get('/school-years/students-by-grade'),
        axios.get('/school-years/promotion-preview'),
        axios.get('/school-years/archived'),
        axios.get('/school-years/promotion-history'),
        axios.get('/school-years/promotion-candidates'),
        axios.get('/classes')
      ]);

      if (syRes.status === 'fulfilled') {
        const list = syRes.value.data?.data || [];
        // Sort newest to oldest by start_date
        const sorted = [...list].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        setSchoolYears(sorted.map((sy) => ({ ...sy, label: formatSchoolYearLabel(sy.label) })));
        // Auto-set newest as active if current active is older
        const newest = sorted[0] || null;
        const activeRaw = activeRes.status === 'fulfilled' ? (activeRes.value.data?.data || null) : null;
        if (newest && (!activeRaw || activeRaw.id !== newest.id)) {
          try {
            await axios.put(`/school-years/${newest.id}/activate`);
            toast.success(`${formatSchoolYearLabel(newest.label)} set as active (older years locked).`);
            // Reload after activation to refresh badges/state
            await loadData();
            return;
          } catch (e) {
            console.error('Auto-activate newest failed:', e.message);
          }
        }
      }

      if (activeRes.status === 'fulfilled') {
        const activeRaw = activeRes.value.data?.data || null;
        const formattedActive = activeRaw ? { ...activeRaw, label: formatSchoolYearLabel(activeRaw.label) } : null;
        setActiveSchoolYear(formattedActive);
        // Keep current viewing year if already chosen; only default to active when empty.
        setViewingSchoolYear((prev) => {
          if (prev) return prev;
          return formattedActive || null;
        });
      }
      if (gradeRes.status === 'fulfilled') setStudentsByGrade(gradeRes.value.data?.data || []);
      if (previewRes.status === 'fulfilled') setPromotionPreview(previewRes.value.data?.data || []);
      if (archivedRes.status === 'fulfilled') {
        const archived = archivedRes.value.data?.data || [];
        setArchivedSchoolYears(archived.map((sy) => ({ ...sy, label: formatSchoolYearLabel(sy.label) })));
      }
      if (historyRes.status === 'fulfilled') setPromotionHistory(historyRes.value.data?.data || []);
      if (candidatesRes.status === 'fulfilled') setPromotionCandidates(candidatesRes.value.data?.data || []);
      if (classesRes.status === 'fulfilled') {
        const classesData = Array.isArray(classesRes.value.data)
          ? classesRes.value.data
          : (Array.isArray(classesRes.value.data?.data) ? classesRes.value.data.data : []);
        setClasses(classesData);
      }

      if (activeRes.status === 'fulfilled') {
        const active = activeRes.value.data?.data || null;
        if (active?.id) {
          setSelectedPromotionSchoolYearId(String(active.id));
        }
      }

      const failed = [syRes, activeRes, gradeRes, previewRes, archivedRes, historyRes, candidatesRes, classesRes].filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('Some school year data failed to load:', failed.map(f => f.reason?.message));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load school year data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchoolYear = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/school-years', formData);
      toast.success('School year created successfully!');
      setShowAddModal(false);
      setFormData({
        label: '',
        start_date: '',
        end_date: '',
        q1_end_date: '',
        q2_end_date: '',
        q3_end_date: '',
        q4_end_date: '',
        principal_name: '',
        assistant_principal_name: '',
        is_active: false
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create school year');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSchoolYear = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.put(`/school-years/${selectedSchoolYear.id}`, formData);
      toast.success('School year updated successfully!');
      setShowEditModal(false);
      setSelectedSchoolYear(null);
      setFormData({
        label: '',
        start_date: '',
        end_date: '',
        q1_end_date: '',
        q2_end_date: '',
        q3_end_date: '',
        q4_end_date: '',
        principal_name: '',
        assistant_principal_name: '',
        is_active: false
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update school year');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setIsSubmitting(true);
    try {
      await axios.put(`/school-years/${selectedSchoolYear.id}/archive`);
      toast.success('School year archived successfully!');
      setShowArchiveModal(false);
      setSelectedSchoolYear(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to archive school year');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await axios.put(`/school-years/${id}/restore`);
      toast.success('School year restored successfully!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restore school year');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this school year permanently?')) return;
    try {
      await axios.delete(`/school-years/${id}`);
      toast.success('School year deleted permanently.');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete school year');
    }
  };

  const handleSetActive = async (id) => {
    try {
      await axios.put(`/school-years/${id}/activate`);
      toast.success('School year set as active!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set active school year');
    }
  };

  const handlePromoteStudents = async (mode = 'all') => {
    setIsSubmitting(true);
    try {
      const selectedIds = Array.from(selectedCandidateIds);
      if (mode === 'selected' && selectedIds.length === 0) {
        toast.error('Please select at least one eligible student to promote.');
        setIsSubmitting(false);
        return;
      }

      if (!selectedPromotionSchoolYearId) {
        toast.error('Please select a school year for this promotion run.');
        setIsSubmitting(false);
        return;
      }

      const selectedCandidates = promotionCandidates.filter(c => selectedIds.includes(c.id));
      const needsAssignment = selectedCandidates.filter(c => c.canPromote && c.toGrade !== 'Graduate');

      for (const cand of needsAssignment) {
        if (!promotionAssignments[cand.id]) {
          toast.error(`Please select target section/adviser for ${cand.name}.`);
          setIsSubmitting(false);
          return;
        }
      }

      const assignments = needsAssignment.map(cand => ({
        studentId: cand.id,
        classId: String(promotionAssignments[cand.id])
      }));

      const payload = mode === 'selected'
        ? { studentIds: selectedIds, assignments, schoolYearId: Number(selectedPromotionSchoolYearId) }
        : { schoolYearId: Number(selectedPromotionSchoolYearId) };

      const response = await axios.post('/school-years/promote-students', payload);
      const data = response.data?.data;
      toast.success(
        <div>
          <strong>Promotion Complete! 🎓</strong>
          <br />✅ {data?.totalPromoted || 0} students promoted
          <br />🎓 {data?.totalGraduated || 0} students graduated
          <br />🔄 {data?.totalRetained || 0} students retained (incomplete grades or avg &lt;75)
        </div>,
        { autoClose: 6000 }
      );
      setShowPromoteModal(false);
      setSelectedCandidateIds(new Set());
      setPromotionAssignments({});
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCandidate = (studentId) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const eligibleCount = promotionCandidates.filter(c => c.canPromote).length;
  const incompleteCount = promotionCandidates.filter(c => !c.hasCompleteGrades).length;
  const failingCount = promotionCandidates.filter(c => c.hasFailingGrade).length;

  const toggleSelectAllEligible = () => {
    const eligibleIds = promotionCandidates.filter(c => c.canPromote).map(c => c.id);
    const allSelected = eligibleIds.length > 0 && eligibleIds.every(id => selectedCandidateIds.has(id));
    setSelectedCandidateIds(allSelected ? new Set() : new Set(eligibleIds));
  };

  const getDestinationClassOptions = (gradeLevel) => {
    return classes.filter(c => String(c.grade || '').toLowerCase() === String(gradeLevel || '').toLowerCase());
  };

  const handleDestinationClassChange = (studentId, classId) => {
    setPromotionAssignments(prev => ({
      ...prev,
      [studentId]: classId
    }));
  };

  const openEditModal = (sy) => {
    if (activeSchoolYear && sy.id !== activeSchoolYear.id) {
      toast.info('Viewing past school year — read only. Activate it first to edit.');
      return;
    }
    setSelectedSchoolYear(sy);
    setFormData({
      label: sy.label,
      start_date: sy.start_date?.split('T')[0] || '',
      end_date: sy.end_date?.split('T')[0] || '',
      q1_end_date: sy.q1_end_date?.split('T')[0] || '',
      q2_end_date: sy.q2_end_date?.split('T')[0] || '',
      q3_end_date: sy.q3_end_date?.split('T')[0] || '',
      q4_end_date: sy.q4_end_date?.split('T')[0] || '',
      principal_name: sy.principal_name || '',
      assistant_principal_name: sy.assistant_principal_name || '',
      is_active: sy.is_active === 1
    });
    setShowEditModal(true);
  };

  const parseStudentName = (fullName = '') => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  };

  const handleOpenStudentReportCard = (row) => {
    if (!row?.student_id) {
      toast.info('No student link available for this log record.');
      return;
    }

    const nameParts = parseStudentName(row.student_name);
    const gradeLevel = row.to_grade || row.from_grade || '';
    const section = row.to_section || row.from_section || '';

    setReportCardStudent({
      id: row.student_id,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      fullName: row.student_name,
      gradeLevel,
      section,
      lrn: row.lrn || ''
    });
    setShowReportCard(true);
  };

  const openArchiveModal = (sy) => {
    if (activeSchoolYear && sy.id !== activeSchoolYear.id) {
      toast.info('Viewing past school year — read only. Activate it first to archive.');
      return;
    }
    setSelectedSchoolYear(sy);
    setShowArchiveModal(true);
  };

  // Format chart data
  const chartData = studentsByGrade.map(item => ({
    name: item.grade,
    count: item.count,
    fill: GRADE_COLORS[item.grade] || '#6b7280'
  }));

  const historyGrades = ['All Grades', ...new Set(
    promotionHistory
      .map(h => h.from_grade)
      .filter(Boolean)
  )];

  const historySections = ['All Sections', ...new Set(
    promotionHistory
      .map(h => h.from_section)
      .filter(Boolean)
  )];

  const filteredPromotionHistory = promotionHistory.filter((row) => {
    const gradeOk = historyGradeFilter === 'All Grades' || row.from_grade === historyGradeFilter;
    const sectionOk = historySectionFilter === 'All Sections' || row.from_section === historySectionFilter;
    return gradeOk && sectionOk;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Active School Year Banner */}
      <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <CalendarDaysIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-red-100">Active School Year</p>
              <h2 className="text-3xl font-bold">
                {activeSchoolYear ? activeSchoolYear.label : 'Not Set'}
              </h2>
              {activeSchoolYear && (
                <p className="text-sm text-red-100 mt-1">
                  {new Date(activeSchoolYear.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} 
                  {' - '}
                  {new Date(activeSchoolYear.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white text-red-800 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition"
          >
            <PlusIcon className="w-5 h-5" />
            Add School Year
          </button>
          <button
            onClick={async () => {
              setLeadershipFetching(true);
              try {
                const prevRes = await axios.get('/school-years/previous-year/leadership');
                const hasData = prevRes.data?.data && (prevRes.data.data.principal_name || prevRes.data.data.assistant_principal_name);
                if (!hasData) {
                  toast.info('No principal/assistant found in previous year');
                } else {
                  await axios.post('/school-years/fetch-leadership-from-previous');
                  toast.success('Copied principal/assistant from previous year');
                  await loadData();
                }
              } catch (e) {
                toast.error(e.response?.data?.message || 'Failed to fetch leadership from previous year');
              } finally {
                setLeadershipFetching(false);
              }
            }}
            disabled={leadershipFetching}
            className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-5 h-5 ${leadershipFetching ? 'animate-spin' : ''}`} />
            Fetch Principal (Prev SY)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Years List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5 text-red-800" />
              School Years
            </h3>
            <button
              onClick={() => setShowArchivedList(!showArchivedList)}
              className="text-sm text-gray-500 hover:text-red-800 flex items-center gap-1"
            >
              <ArchiveBoxIcon className="w-4 h-4" />
              {showArchivedList ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>

          <div className="space-y-3">
            {schoolYears.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No school years found</p>
            ) : (
              schoolYears.map((sy, idx) => {
                const isActive = sy.is_active === 1;
                const isViewing = viewingSchoolYear && viewingSchoolYear.id === sy.id;
                const newestStart = schoolYears[0]?.start_date;
                const isNewest = newestStart && new Date(sy.start_date).getTime() === new Date(newestStart).getTime();
                const canActivate = !isActive && isNewest; // Only newest (latest) non-active year can be activated

                return (
                  <button
                    key={sy.id}
                    onClick={() => setViewingSchoolYear(sy)}
                    className={`w-full text-left flex items-center justify-between p-4 rounded-lg border transition ${
                      isActive ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                    } ${isViewing ? 'ring-2 ring-orange-200' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full inline-block ${
                          isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        aria-hidden
                      />
                      <div>
                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                          {sy.label}
                          {isActive && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">Active</span>
                          )}
                          {isViewing && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200">Viewing</span>
                          )}
                          {!isActive && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">Locked</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(sy.start_date).toLocaleDateString()} - {new Date(sy.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canActivate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetActive(sy.id);
                          }}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                          title="Set as Active (locks previous year)"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(sy);
                        }}
                        disabled={activeSchoolYear && sy.id !== activeSchoolYear.id}
                        className={`p-2 rounded-lg transition ${activeSchoolYear && sy.id !== activeSchoolYear.id ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                        title={activeSchoolYear && sy.id !== activeSchoolYear.id ? 'View only — activate to edit' : 'Edit'}
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      {!sy.is_active && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openArchiveModal(sy);
                          }}
                          disabled={activeSchoolYear && sy.id !== activeSchoolYear.id}
                          className={`p-2 rounded-lg transition ${activeSchoolYear && sy.id !== activeSchoolYear.id ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:bg-orange-100'}`}
                          title={activeSchoolYear && sy.id !== activeSchoolYear.id ? 'View only — activate to archive' : 'Archive'}
                        >
                          <ArchiveBoxIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })
            )}

            {/* Archived School Years */}
            {showArchivedList && archivedSchoolYears.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-500 mb-2">Archived</p>
                {archivedSchoolYears.map((sy) => (
                  <div
                    key={sy.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-100 mb-2"
                  >
                    <div>
                      <p className="font-medium text-gray-600">{sy.label}</p>
                      <p className="text-xs text-gray-400">Archived</p>
                    </div>
                    <button
                      onClick={() => handleRestore(sy.id)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(sy.id)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                      title="Delete permanently"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grade Level Bar Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <UserGroupIcon className="w-5 h-5 text-red-800" />
            Students by Grade Level
          </h3>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} students`, 'Count']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No student data available</p>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {Object.entries(GRADE_COLORS).filter(([key]) => key !== 'Other').map(([grade, color]) => (
              <div key={grade} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-gray-600">{grade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promote Students Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AcademicCapIcon className="w-5 h-5 text-red-800" />
            Student Promotion Preview
          </h3>
          <button
            onClick={() => {
              setShowPromoteModal(true);
              setPromotionAssignments({});
              setSelectedCandidateIds(new Set());
            }}
            className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            <ArrowUpIcon className="w-5 h-5" />
            Promote Students
          </button>
        </div>

        {promotionPreview.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No student data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Current Grade</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Total</th>
                  <th className="text-center py-2 px-3 text-blue-600 font-medium">✓ Complete Q1-Q4</th>
                  <th className="text-center py-2 px-3 text-green-600 font-medium">↑ Promote (avg ≥75)</th>
                  <th className="text-center py-2 px-3 text-orange-500 font-medium">↺ Retain (avg &lt;75)</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Promoted To</th>
                </tr>
              </thead>
              <tbody>
                {promotionPreview.map((item, index) => (
                  <tr key={index} className={`border-b border-gray-100 ${
                    item.isGraduating ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}>
                    <td className="py-3 px-3 font-medium text-gray-800">{item.fromGrade}</td>
                    <td className="py-3 px-3 text-center font-bold text-gray-700">{item.total}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full">{item.completeCount ?? 0}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">{item.willPromote}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-orange-100 text-orange-700 font-semibold px-2 py-1 rounded-full">{item.willRetain}</span>
                    </td>
                    <td className={`py-3 px-3 font-medium ${
                      item.isGraduating ? 'text-yellow-600' : 'text-green-600'
                    }`}>{item.toGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion History Logs */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5 text-red-800" />
            Promotion History Logs
          </h3>
          <span className="text-xs text-gray-500">Showing {filteredPromotionHistory.length} of {promotionHistory.length} records</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter by Grade</label>
            <select
              value={historyGradeFilter}
              onChange={(e) => setHistoryGradeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {historyGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter by Section</label>
            <select
              value={historySectionFilter}
              onChange={(e) => setHistorySectionFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {historySections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredPromotionHistory.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No promotion history yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Student</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">LRN</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">From</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">To</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Average</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotionHistory.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">
                      {row.student_id ? (
                        <button
                          type="button"
                          onClick={() => handleOpenStudentReportCard(row)}
                          className="text-blue-700 hover:text-blue-900 hover:underline"
                          title="View report card"
                        >
                          {row.student_name}
                        </button>
                      ) : (
                        row.student_name
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-700">{row.lrn || '-'}</td>
                    <td className="py-2 px-3 text-gray-700">{row.from_grade}{row.from_section ? ` - ${row.from_section}` : ''}</td>
                    <td className="py-2 px-3 text-gray-700">{row.to_grade || '-'}{row.to_section ? ` - ${row.to_section}` : ''}</td>
                    <td className="py-2 px-3 text-center text-gray-700">{row.average ?? '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'promoted' ? 'bg-green-100 text-green-700' :
                        row.status === 'graduated' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{row.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add School Year Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add School Year</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddSchoolYear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label (e.g., 2025-2026)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="2025-2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q1 End Date</label>
                  <input
                    type="date"
                    value={formData.q1_end_date}
                    onChange={(e) => setFormData({ ...formData, q1_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q2 End Date</label>
                  <input
                    type="date"
                    value={formData.q2_end_date}
                    onChange={(e) => setFormData({ ...formData, q2_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q3 End Date</label>
                  <input
                    type="date"
                    value={formData.q3_end_date}
                    onChange={(e) => setFormData({ ...formData, q3_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q4 End Date</label>
                  <input
                    type="date"
                    value={formData.q4_end_date}
                    onChange={(e) => setFormData({ ...formData, q4_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                <input
                  type="text"
                  value={formData.principal_name}
                  onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., MA. NORA D. LAI, Ed.D, JD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Principal Name</label>
                <input
                  type="text"
                  value={formData.assistant_principal_name}
                  onChange={(e) => setFormData({ ...formData, assistant_principal_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Assistant Principal"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Set as active school year</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit School Year Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit School Year</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditSchoolYear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q1 End Date</label>
                  <input
                    type="date"
                    value={formData.q1_end_date}
                    onChange={(e) => setFormData({ ...formData, q1_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q2 End Date</label>
                  <input
                    type="date"
                    value={formData.q2_end_date}
                    onChange={(e) => setFormData({ ...formData, q2_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q3 End Date</label>
                  <input
                    type="date"
                    value={formData.q3_end_date}
                    onChange={(e) => setFormData({ ...formData, q3_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q4 End Date</label>
                  <input
                    type="date"
                    value={formData.q4_end_date}
                    onChange={(e) => setFormData({ ...formData, q4_end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                <input
                  type="text"
                  value={formData.principal_name}
                  onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., MA. NORA D. LAI, Ed.D, JD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Principal Name</label>
                <input
                  type="text"
                  value={formData.assistant_principal_name}
                  onChange={(e) => setFormData({ ...formData, assistant_principal_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Assistant Principal"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="edit_is_active" className="text-sm text-gray-700">Set as active school year</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Archive School Year?</h3>
                <p className="text-sm text-gray-500">This action can be undone later</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive <strong>{selectedSchoolYear?.label}</strong>? 
              Archived school years will be hidden from the main list but can be restored.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Students Confirmation Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-6xl shadow-xl max-h-[94vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-3 rounded-full">
                  <AcademicCapIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Promote Students</h3>
                  <p className="text-sm text-gray-500">Requires complete Q1-Q4 grades for all subjects + average ≥ 75</p>
                </div>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Manual: Select student + assign section/adviser</span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">Automatic: Promote all using system auto-assignment</span>
              </div>
            </div>

            {/* Passing grade rule */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <strong>Promotion Rule:</strong> Students are promoted only if they have <strong>complete grades for all required subjects in Q1-Q4</strong> and an overall average of <strong>75 or above</strong>. Incomplete or failing students are retained; this applies to both manual and automatic runs.
            </div>

            {/* Breakdown table */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Grade-by-Grade Breakdown:</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1 text-gray-500 font-medium">Grade</th>
                    <th className="text-center py-1 text-blue-600 font-medium">✓ Complete Q1-Q4</th>
                    <th className="text-center py-1 text-green-600 font-medium">↑ Promote</th>
                    <th className="text-center py-1 text-orange-500 font-medium">↺ Retain</th>
                    <th className="text-left py-1 text-gray-500 font-medium">Moving To</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionPreview.map((item, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${ item.isGraduating ? 'bg-yellow-50' : '' }`}>
                      <td className="py-2 font-medium text-gray-800">{item.fromGrade}</td>
                      <td className="py-2 text-center">
                        <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{item.completeCount ?? 0}</span>
                      </td>
                      <td className="py-2 text-center">
                        <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">{item.willPromote ?? item.count}</span>
                      </td>
                      <td className="py-2 text-center">
                        <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{item.willRetain ?? 0}</span>
                      </td>
                      <td className={`py-2 font-medium ${ item.isGraduating ? 'text-yellow-600' : 'text-green-600' }`}>{item.toGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Promotion School Year</label>
                <select
                  value={selectedPromotionSchoolYearId}
                  onChange={(e) => setSelectedPromotionSchoolYearId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select school year</option>
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>{sy.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Select Eligible Students (Optional)</p>
                <button
                  type="button"
                  onClick={toggleSelectAllEligible}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {promotionCandidates.filter(c => c.canPromote).every(c => selectedCandidateIds.has(c.id)) ? 'Clear Selection' : 'Select All Eligible'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Eligible: {eligibleCount}</span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Complete Q1-Q4: {promotionCandidates.length - incompleteCount}</span>
                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">Incomplete: {incompleteCount}</span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">With Failing Grade: {failingCount}</span>
              </div>
              <div className="max-h-[46vh] overflow-auto border border-gray-200 rounded bg-white">
                {promotionCandidates.length === 0 ? (
                  <p className="text-sm text-gray-500 p-3">No candidates found</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="text-left py-2 px-2">Select</th>
                        <th className="text-left py-2 px-2">Student</th>
                        <th className="text-left py-2 px-2">From</th>
                        <th className="text-left py-2 px-2">To</th>
                        <th className="text-left py-2 px-2">Grades</th>
                        <th className="text-left py-2 px-2">Target Section / Adviser</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotionCandidates.map((cand) => (
                        <tr key={cand.id} className="border-t border-gray-100">
                          <td className="py-2 px-2">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.has(cand.id)}
                              onChange={() => toggleCandidate(cand.id)}
                              disabled={!cand.canPromote}
                              title={cand.canPromote ? 'Eligible to promote' : (cand.reason || 'Not eligible')}
                            />
                          </td>
                          <td className="py-2 px-2">{cand.name}</td>
                          <td className="py-2 px-2">{cand.fromGrade}</td>
                          <td className="py-2 px-2">{cand.toGrade}</td>
                          <td className="py-2 px-2 min-w-[220px]">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-semibold">Avg: {cand.average ?? '-'}</span>
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${cand.hasCompleteGrades ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {cand.hasCompleteGrades ? 'Q1-Q4 Complete' : 'Missing Grades'}
                              </span>
                              {cand.hasFailingGrade && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Has Grade below 75</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 min-w-[220px]">
                            {cand.toGrade === 'Graduate' ? (
                              <span className="text-gray-400">N/A (Graduate)</span>
                            ) : (
                              <select
                                value={promotionAssignments[cand.id] || ''}
                                onChange={(e) => handleDestinationClassChange(cand.id, e.target.value)}
                                disabled={!cand.canPromote || !selectedCandidateIds.has(cand.id)}
                                className="w-full border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                              >
                                <option value="">Select destination class</option>
                                {getDestinationClassOptions(cand.toGrade).map((cls) => (
                                  <option key={cls.id} value={cls.id}>
                                    {`${cls.grade} - ${cls.section} (${cls.adviser_name || 'No Adviser'})`}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${cand.canPromote ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {cand.canPromote ? 'Eligible' : 'Not Eligible'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-600 min-w-[200px]">
                            {cand.reason || (cand.canPromote ? 'Eligible for promotion' : 'Not eligible')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Warning:</strong> This action <strong>cannot be undone</strong>. Grade 6 students who pass will be marked as <strong>Graduated 🎓</strong>. Kindergarten students who pass will move to <strong>Grade 1</strong>.
              </p>
            </div>

            <div className="sticky bottom-0 bg-white pt-3 border-t border-gray-100 flex flex-col md:flex-row gap-3">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="md:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePromoteStudents('selected')}
                disabled={isSubmitting || selectedCandidateIds.size === 0}
                className="md:flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Promoting...' : `Manual Promote Selected (${selectedCandidateIds.size})`}
              </button>
              <button
                onClick={() => handlePromoteStudents('all')}
                disabled={isSubmitting}
                className="md:flex-1 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Promoting...' : 'Automatic Promote All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Report Card Modal */}
      {showReportCard && reportCardStudent && (
        <GradesReportCard
          students={[reportCardStudent]}
          quarter="q4"
          gradeLevel={reportCardStudent.gradeLevel}
          section={reportCardStudent.section}
          schoolYearId={viewingSchoolYear?.id || activeSchoolYear?.id || undefined}
          onClose={() => {
            setShowReportCard(false);
            setReportCardStudent(null);
          }}
        />
      )}
    </div>
  );
}
