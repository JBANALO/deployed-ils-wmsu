import React, { useState, useEffect } from "react";
import { 
  RectangleGroupIcon,
  PlusIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserGroupIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";

export default function AdminSections() {
  const [sections, setSections] = useState([]);
  const [archivedSections, setArchivedSections] = useState([]);
  const [sectionStats, setSectionStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchivedList, setShowArchivedList] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, archivedRes, statsRes] = await Promise.all([
        axios.get('/sections'),
        axios.get('/sections/archived'),
        axios.get('/sections/stats')
      ]);
      setSections(activeRes.data?.data || []);
      setArchivedSections(archivedRes.data?.data || []);
      setSectionStats(statsRes.data?.data || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/sections', formData);
      toast.success('Section created successfully!');
      setShowAddModal(false);
      setFormData({ name: '', description: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create section');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSection = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.put(`/sections/${selectedSection.id}`, formData);
      toast.success('Section updated successfully!');
      setShowEditModal(false);
      setSelectedSection(null);
      setFormData({ name: '', description: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update section');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setIsSubmitting(true);
    try {
      await axios.put(`/sections/${selectedSection.id}/archive`);
      toast.success('Section archived successfully!');
      setShowArchiveModal(false);
      setSelectedSection(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to archive section');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await axios.put(`/sections/${id}/restore`);
      toast.success('Section restored successfully!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restore section');
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await axios.delete(`/sections/${selectedSection.id}`);
      toast.success('Section deleted permanently!');
      setShowDeleteModal(false);
      setSelectedSection(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete section');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (section) => {
    setSelectedSection(section);
    setFormData({
      name: section.name,
      description: section.description || ''
    });
    setShowEditModal(true);
  };

  const openArchiveModal = (section) => {
    setSelectedSection(section);
    setShowArchiveModal(true);
  };

  const openDeleteModal = (section) => {
    setSelectedSection(section);
    setShowDeleteModal(true);
  };

  // Get class count for a section
  const getClassCount = (sectionName) => {
    const stat = sectionStats.find(s => s.name === sectionName);
    return stat?.class_count || 0;
  };

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (section.description && section.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <RectangleGroupIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-emerald-100">Section Management</p>
              <h2 className="text-3xl font-bold">{sections.length} Sections</h2>
              <p className="text-sm text-emerald-100 mt-1">
                {archivedSections.length} archived sections
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white text-emerald-800 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition"
          >
            <PlusIcon className="w-5 h-5" />
            Add Section
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-md">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowArchivedList(!showArchivedList)}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-800 px-4 py-2 rounded-lg border border-gray-200 hover:border-emerald-300 transition"
          >
            <ArchiveBoxIcon className="w-5 h-5" />
            {showArchivedList ? 'Hide Archived' : `Show Archived (${archivedSections.length})`}
          </button>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <RectangleGroupIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No sections found</p>
            <p className="text-sm">Click "Add Section" to create one</p>
          </div>
        ) : (
          filteredSections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <RectangleGroupIcon className="w-6 h-6 text-emerald-800" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{section.name}</h4>
                    {section.description && (
                      <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                    )}
                  </div>
                </div>
                {getClassCount(section.name) > 0 && (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs">
                    <UserGroupIcon className="w-3 h-3" />
                    {getClassCount(section.name)} {getClassCount(section.name) === 1 ? 'class' : 'classes'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(section)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => openArchiveModal(section)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition"
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                  Archive
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Archived Sections */}
      {showArchivedList && archivedSections.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5" />
            Archived Sections
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedSections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-lg p-4 border border-gray-200 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-600">{section.name}</h4>
                    {section.description && (
                      <p className="text-sm text-gray-400">{section.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRestore(section.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                      title="Restore"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(section)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add New Section</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Rizal"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Named after Jose Rizal"
                />
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Section</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArchiveBoxIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Archive Section?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to archive <span className="font-semibold">{selectedSection?.name}</span>?
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Section Permanently?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete <span className="font-semibold">{selectedSection?.name}</span>?
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
