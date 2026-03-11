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
  ArrowUpIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
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
  'Grade 1': '#ef4444',
  'Grade 2': '#f97316',
  'Grade 3': '#eab308',
  'Grade 4': '#22c55e',
  'Grade 5': '#3b82f6',
  'Grade 6': '#8b5cf6',
  'Other': '#6b7280'
};

export default function AdminSchoolYear() {
  const [schoolYears, setSchoolYears] = useState([]);
  const [archivedSchoolYears, setArchivedSchoolYears] = useState([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [studentsByGrade, setStudentsByGrade] = useState([]);
  const [promotionPreview, setPromotionPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showArchivedList, setShowArchivedList] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    start_date: '',
    end_date: '',
    is_active: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [syRes, activeRes, gradeRes, previewRes, archivedRes] = await Promise.allSettled([
        axios.get('/school-years'),
        axios.get('/school-years/active'),
        axios.get('/school-years/students-by-grade'),
        axios.get('/school-years/promotion-preview'),
        axios.get('/school-years/archived')
      ]);

      if (syRes.status === 'fulfilled') setSchoolYears(syRes.value.data?.data || []);
      if (activeRes.status === 'fulfilled') setActiveSchoolYear(activeRes.value.data?.data || null);
      if (gradeRes.status === 'fulfilled') setStudentsByGrade(gradeRes.value.data?.data || []);
      if (previewRes.status === 'fulfilled') setPromotionPreview(previewRes.value.data?.data || []);
      if (archivedRes.status === 'fulfilled') setArchivedSchoolYears(archivedRes.value.data?.data || []);

      const failed = [syRes, activeRes, gradeRes, previewRes, archivedRes].filter(r => r.status === 'rejected');
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
      setFormData({ label: '', start_date: '', end_date: '', is_active: false });
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
      setFormData({ label: '', start_date: '', end_date: '', is_active: false });
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

  const handleSetActive = async (id) => {
    try {
      await axios.put(`/school-years/${id}/activate`);
      toast.success('School year set as active!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set active school year');
    }
  };

  const handlePromoteStudents = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post('/school-years/promote-students');
      const data = response.data?.data;
      toast.success(
        <div>
          <strong>Promotion Complete!</strong>
          <br />
          {data?.totalPromoted || 0} students promoted
          <br />
          {data?.totalGraduated || 0} students graduated 🎉
        </div>,
        { autoClose: 5000 }
      );
      setShowPromoteModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (sy) => {
    setSelectedSchoolYear(sy);
    setFormData({
      label: sy.label,
      start_date: sy.start_date?.split('T')[0] || '',
      end_date: sy.end_date?.split('T')[0] || '',
      is_active: sy.is_active === 1
    });
    setShowEditModal(true);
  };

  const openArchiveModal = (sy) => {
    setSelectedSchoolYear(sy);
    setShowArchiveModal(true);
  };

  // Format chart data
  const chartData = studentsByGrade.map(item => ({
    name: item.grade,
    count: item.count,
    fill: GRADE_COLORS[item.grade] || '#6b7280'
  }));

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
              schoolYears.map((sy) => (
                <div
                  key={sy.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    sy.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {sy.is_active && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">{sy.label}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(sy.start_date).toLocaleDateString()} - {new Date(sy.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!sy.is_active && (
                      <button
                        onClick={() => handleSetActive(sy.id)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                        title="Set as Active"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(sy)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    {!sy.is_active && (
                      <button
                        onClick={() => openArchiveModal(sy)}
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition"
                        title="Archive"
                      >
                        <ArchiveBoxIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
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
            onClick={() => setShowPromoteModal(true)}
            className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            <ArrowUpIcon className="w-5 h-5" />
            Promote All Students
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {promotionPreview.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg text-center ${
                item.isGraduating 
                  ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <p className="text-sm text-gray-500 mb-1">{item.fromGrade}</p>
              <p className="text-2xl font-bold text-gray-800">{item.count}</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-xs text-gray-400">→</span>
                <span className={`text-sm font-medium ${item.isGraduating ? 'text-yellow-700' : 'text-green-600'}`}>
                  {item.toGrade}
                </span>
              </div>
            </div>
          ))}
        </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AcademicCapIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Promote All Students?</h3>
                <p className="text-sm text-gray-500">This will update all student grade levels</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Promotion Summary:</p>
              <ul className="space-y-1">
                {promotionPreview.map((item, index) => (
                  <li key={index} className="text-sm text-gray-600 flex justify-between">
                    <span>{item.fromGrade} → {item.toGrade}</span>
                    <span className="font-medium">{item.count} students</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Grade 6 students will be marked as graduates and will no longer appear in the student list.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteStudents}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Promoting...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
