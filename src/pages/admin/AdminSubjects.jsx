import React, { useState, useEffect } from "react";
import { 
  BookOpenIcon,
  PlusIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  AcademicCapIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import { useSchoolYear } from "../../context/SchoolYearContext";
import axios from "../../api/axiosConfig";

const GRADE_TABS = [
  { key: 'all', label: 'All Grades' },
  { key: 'Kindergarten', label: 'Kindergarten' },
  { key: '1', label: 'Grade 1' },
  { key: '2', label: 'Grade 2' },
  { key: '3', label: 'Grade 3' },
  { key: '4', label: 'Grade 4' },
  { key: '5', label: 'Grade 5' },
  { key: '6', label: 'Grade 6' },
];

const GRADE_COLORS = {
  'Kindergarten': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  '1': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  '2': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  '3': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  '4': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  '5': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  '6': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  '4,5,6': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
};

export default function AdminSubjects() {
  const { viewingSchoolYear, activeSchoolYear, isViewingLocked } = useSchoolYear();
  const [subjects, setSubjects] = useState([]);
  const [archivedSubjects, setArchivedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchivedList, setShowArchivedList] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grade_levels: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [prevSubjects, setPrevSubjects] = useState([]);
  const [selectedPrevIds, setSelectedPrevIds] = useState(new Set());
  const [fetchLoading, setFetchLoading] = useState(false);
  const targetSchoolYearId = viewingSchoolYear?.id || activeSchoolYear?.id || '';

  useEffect(() => {
    loadData();
  }, [targetSchoolYearId]);

  const loadPrevSubjects = async () => {
    try {
      setFetchLoading(true);
      const res = await axios.get('/subjects/previous-year', {
        params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
      });
      setPrevSubjects(res.data?.data || []);
      setSelectedPrevIds(new Set());
    } catch (error) {
      console.error('Error loading previous year subjects:', error);
      toast.error('Failed to load previous year subjects');
    } finally {
      setFetchLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, archivedRes] = await Promise.all([
        axios.get('/subjects', {
          params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
        }),
        axios.get('/subjects/archived', {
          params: targetSchoolYearId ? { schoolYearId: targetSchoolYearId } : {}
        })
      ]);
      setSubjects(activeRes.data?.data || []);
      setArchivedSubjects(archivedRes.data?.data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/subjects', formData);
      toast.success('Subject created successfully!');
      setShowAddModal(false);
      setFormData({ name: '', description: '', grade_levels: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.put(`/subjects/${selectedSubject.id}`, formData);
      toast.success('Subject updated successfully!');
      setShowEditModal(false);
      setSelectedSubject(null);
      setFormData({ name: '', description: '', grade_levels: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setIsSubmitting(true);
    try {
      await axios.put(`/subjects/${selectedSubject.id}/archive`);
      toast.success('Subject archived successfully!');
      setShowArchiveModal(false);
      setSelectedSubject(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to archive subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await axios.put(`/subjects/${id}/restore`);
      toast.success('Subject restored successfully!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restore subject');
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await axios.delete(`/subjects/${selectedSubject.id}`);
      toast.success('Subject deleted permanently!');
      setShowDeleteModal(false);
      setSelectedSubject(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      grade_levels: subject.grade_levels || ''
    });
    setShowEditModal(true);
  };

  const openArchiveModal = (subject) => {
    setSelectedSubject(subject);
    setShowArchiveModal(true);
  };

  const openDeleteModal = (subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  };

  const openAddModal = () => {
    setFormData({ 
      name: '', 
      description: '', 
      grade_levels: activeTab === 'all' ? '' : activeTab 
    });
    setShowAddModal(true);
  };

  const togglePrevSelection = (id) => {
    setSelectedPrevIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPrev = () => {
    if (selectedPrevIds.size === prevSubjects.length) {
      setSelectedPrevIds(new Set());
    } else {
      setSelectedPrevIds(new Set(prevSubjects.map((s) => s.id)));
    }
  };

  const handleFetchFromPrevious = async () => {
    try {
      setFetchLoading(true);
      const ids = Array.from(selectedPrevIds);
      const res = await axios.post('/subjects/fetch-from-previous', { ids });
      toast.success(`Fetched subjects: inserted ${res.data?.data?.inserted || 0}, skipped ${res.data?.data?.skipped || 0}`);
      setShowFetchModal(false);
      setSelectedPrevIds(new Set());
      loadData();
    } catch (error) {
      console.error('Error fetching from previous year:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch subjects');
    } finally {
      setFetchLoading(false);
    }
  };

  // Filter subjects based on tab and search
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') {
      return matchesSearch;
    }
    
    const grades = (subject.grade_levels || '').split(',');
    return matchesSearch && grades.includes(activeTab);
  });

  // Group subjects by grade for display
  const getGradeLabel = (gradeLevels) => {
    if (!gradeLevels) return 'All Grades';
    const grades = gradeLevels.split(',');
    if (grades.length === 1) {
      if (grades[0] === 'Kindergarten') return 'Kindergarten';
      return `Grade ${grades[0]}`;
    }
    if (grades.length === 3 && grades.includes('4') && grades.includes('5') && grades.includes('6')) {
      return 'Grade 4-6';
    }
    return `Grade ${grades.join(', ')}`;
  };

  const getGradeStyle = (gradeLevels) => {
    if (!gradeLevels) return GRADE_COLORS['1'];
    return GRADE_COLORS[gradeLevels] || GRADE_COLORS[gradeLevels.split(',')[0]] || GRADE_COLORS['1'];
  };

  // Count subjects per grade
  const getSubjectCountByGrade = (grade) => {
    if (grade === 'all') return subjects.length;
    return subjects.filter(s => (s.grade_levels || '').split(',').includes(grade)).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <BookOpenIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-blue-100">Subject Management</p>
              <h2 className="text-3xl font-bold">{subjects.length} Subjects</h2>
              <p className="text-sm text-blue-100 mt-1">
                Organized by Grade Level (K-6 DepEd Curriculum)
              </p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-white text-blue-800 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            <PlusIcon className="w-5 h-5" />
            Add Subject
          </button>
          <button
            onClick={() => { setShowFetchModal(true); loadPrevSubjects(); }}
            className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Fetch from Previous Year
          </button>
        </div>
      </div>

      {/* Grade Level Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {GRADE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {getSubjectCountByGrade(tab.key)}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-md">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowArchivedList(!showArchivedList)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-800 px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300 transition"
          >
            <ArchiveBoxIcon className="w-5 h-5" />
            {showArchivedList ? 'Hide Archived' : `Show Archived (${archivedSubjects.length})`}
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No subjects found for {activeTab === 'all' ? 'any grade' : `Grade ${activeTab}`}</p>
            <p className="text-sm">Click "Add Subject" to create one</p>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const style = getGradeStyle(subject.grade_levels);
            return (
              <div
                key={subject.id}
                className={`bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition border-l-4 ${style.border}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${style.bg} p-2 rounded-lg`}>
                      <BookOpenIcon className={`w-6 h-6 ${style.text}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{subject.name}</h4>
                      {subject.description && (
                        <p className="text-sm text-gray-500 mt-1">{subject.description}</p>
                      )}
                    </div>
                  </div>
                  <span className={`${style.bg} ${style.text} px-2 py-1 rounded-full text-xs font-medium`}>
                    {getGradeLabel(subject.grade_levels)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(subject)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => openArchiveModal(subject)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  >
                    <ArchiveBoxIcon className="w-4 h-4" />
                    Archive
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Archived Subjects */}
      {showArchivedList && archivedSubjects.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5" />
            Archived Subjects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white rounded-lg p-4 border border-gray-200 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-600">{subject.name}</h4>
                    <p className="text-xs text-gray-400">{getGradeLabel(subject.grade_levels)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRestore(subject.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                      title="Restore"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(subject)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      title="Delete Permanently"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add New Subject</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Levels *
                </label>
                <select
                  value={formData.grade_levels}
                  onChange={(e) => setFormData({ ...formData, grade_levels: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Grade Level(s)</option>
                  <option value="Kindergarten">Kindergarten Only</option>
                  <option value="1">Grade 1 Only</option>
                  <option value="2">Grade 2 Only</option>
                  <option value="3">Grade 3 Only</option>
                  <option value="4">Grade 4 Only</option>
                  <option value="5">Grade 5 Only</option>
                  <option value="6">Grade 6 Only</option>
                  <option value="4,5,6">Grade 4-6 (Upper Elementary)</option>
                  <option value="1,2,3">Grade 1-3 (Lower Elementary)</option>
                  <option value="1,2,3,4,5,6">All Grades (1-6)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Subject</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Levels *
                </label>
                <select
                  value={formData.grade_levels}
                  onChange={(e) => setFormData({ ...formData, grade_levels: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Grade Level(s)</option>
                  <option value="Kindergarten">Kindergarten Only</option>
                  <option value="1">Grade 1 Only</option>
                  <option value="2">Grade 2 Only</option>
                  <option value="3">Grade 3 Only</option>
                  <option value="4">Grade 4 Only</option>
                  <option value="5">Grade 5 Only</option>
                  <option value="6">Grade 6 Only</option>
                  <option value="4,5,6">Grade 4-6 (Upper Elementary)</option>
                  <option value="1,2,3">Grade 1-3 (Lower Elementary)</option>
                  <option value="1,2,3,4,5,6">All Grades (1-6)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fetch from Previous Year Modal */}
      {showFetchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Fetch Subjects from Previous School Year</h3>
              <button
                onClick={() => setShowFetchModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Select subjects to copy into the current school year. Existing subjects with the same name and grade levels are skipped.</p>
              <button
                onClick={toggleSelectAllPrev}
                className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {selectedPrevIds.size === prevSubjects.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border rounded-lg max-h-[420px] overflow-y-auto">
              {fetchLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500">Loading previous year subjects...</div>
              ) : prevSubjects.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-gray-500">No subjects found in previous year.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Select</th>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-left">Grade Levels</th>
                      <th className="p-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prevSubjects.map((subj) => (
                      <tr key={subj.id} className="border-b">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedPrevIds.has(subj.id)}
                            onChange={() => togglePrevSelection(subj.id)}
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-800">{subj.name}</td>
                        <td className="p-3 text-gray-600">{subj.grade_levels}</td>
                        <td className="p-3 text-gray-500">{subj.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowFetchModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFetchFromPrevious}
                disabled={fetchLoading || selectedPrevIds.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {fetchLoading ? 'Fetching...' : `Fetch ${selectedPrevIds.size || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArchiveBoxIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Archive Subject?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to archive <span className="font-semibold">{selectedSubject?.name}</span>?
                You can restore it later.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Archiving...' : 'Archive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Subject Permanently?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete <span className="font-semibold">{selectedSubject?.name}</span>?
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
