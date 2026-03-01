import React, { useState, useEffect } from "react";
import { UsersIcon, CheckIcon, XMarkIcon, PencilSquareIcon, TrashIcon, EyeIcon, ArrowUpTrayIcon, KeyIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import TeacherBulkImportModal from "../../components/modals/TeacherBulkImportModal";
import api from "../../api/axiosConfig";
import toast from 'react-hot-toast';

export default function AdminTeachers() {
  const navigate = useNavigate();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Helper function to fix mixed up grade level and section data
  const fixGradeAndSection = (teacher) => {
    const gradeLevel = teacher.grade_level || teacher.gradeLevel || '';
    const section = teacher.section || '';
    const subjects = teacher.subjects || [];
    
    // Check if grade_level contains subject names (common subjects)
    const commonSubjects = ['filipino', 'english', 'mathematics', 'science', 'makabansa', 'gmrc', 'mapeh', 'araling panlipunan', 'edukasyon sa pagpapakatao', 'arpan'];
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

  const fetchTeachers = async (isRefresh = false) => {
    try {
      console.log('Fetching teachers...');
      if (isRefresh) {
        setRefreshLoading(true);
      } else {
        setLoading(true);
      }
      
      // Fetch all teachers and filter for teacher-related roles
      const response = await api.get('/teachers');
      const allTeachers = response.data?.data?.teachers || response.data?.teachers || [];
      console.log('All teachers:', allTeachers);
      
      // Only show approved teachers (not pending or rejected)
      const approvedTeachers = Array.isArray(allTeachers) 
        ? allTeachers.filter(teacher => (teacher.role === 'adviser' || teacher.role === 'subject_teacher'))
        : [];
      console.log('Approved teachers:', approvedTeachers);
      setTeachers(approvedTeachers);
    } catch (error) {
      toast.error('Error fetching teachers: ' + error.message);
      setTeachers([]);
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  };

  // Filter teachers by search
  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = searchQuery === '' ||
      (teacher.firstName && teacher.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (teacher.lastName && teacher.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (teacher.email && teacher.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (teacher.username && teacher.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleSelectTeacher = (teacherId) => {
    const newSelected = new Set(selectedTeachers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedTeachers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTeachers(new Set());
      setSelectAll(false);
    } else {
      setSelectedTeachers(new Set(filteredTeachers.map(t => t.id)));
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeachers.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedTeachers.size} teachers? This action cannot be undone.`)) {
      try {
        for (const teacherId of selectedTeachers) {
          await api.delete(`/teachers/${teacherId}`);
        }
        setSelectedTeachers(new Set());
        setSelectAll(false);
        await fetchTeachers();
        toast.success(`${selectedTeachers.size} teacher records have been successfully removed`);
      } catch (error) {
        toast.error('Error deleting teachers: ' + error.message);
        toast.error('Some teacher records could not be removed. Please try again.');
      }
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await api.delete(`/teachers/${teacherId}`);
        await fetchTeachers();
        toast.success('Teacher record has been successfully removed');
      } catch (error) {
        toast.error('Error deleting teacher: ' + error.message);
        toast.error('Unable to remove teacher record. Please try again.');
      }
    }
  };

  const handleViewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
  };

  const handleViewCredentials = (teacher) => {
    setSelectedTeacher(teacher);
    setShowCredentialsModal(true);
  };

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      role: teacher.role || 'teacher',
      position: teacher.position || '',
      gradeLevel: teacher.gradeLevel || '',
      section: teacher.section || '',
      department: teacher.department || 'Elementary'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      console.log('Saving teacher with data:', editFormData);
      const response = await api.put(`/teachers/${selectedTeacher.id}`, editFormData);
      
      console.log('Save response:', response.data);
      
      await fetchTeachers();
      setShowEditModal(false);
      toast.success('Teacher information has been successfully updated');
    } catch (error) {
      toast.error('Error updating teacher: ' + error.message);
      toast.error(`Unable to update teacher information: ${error.message}`);
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
        View, verify, edit, or remove teacher accounts. Assign subjects and classes.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Total Teachers</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.length}</p>
        </div>
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Subject Teachers</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.filter(t => t.role === 'subject_teacher').length}</p>
        </div>
        <div className="p-3 md:p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-sm md:text-lg font-semibold text-red-800">Advisers</h3>
          <p className="text-xl md:text-2xl font-bold">{teachers.filter(t => t.role === 'adviser').length}</p>
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
            <li>Delete teacher accounts (single or bulk)</li>
            <li>Assign subjects for subject teachers</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button
            onClick={() => navigate('/admin/create-teacher')}
            className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 text-xs md:text-base h-fit"
          >
            <span className="text-lg">+</span>
            Add Teacher
          </button>
          <button
            onClick={() => setShowBulkImportModal(true)}
            className="bg-green-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 text-xs md:text-base h-fit"
          >
            <ArrowUpTrayIcon className="w-4 md:w-5 h-4 md:h-5" />
            Bulk Import
          </button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-800">
            All Teachers - {filteredTeachers.length} teachers
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTeachers(true)}
              disabled={refreshLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className="text-sm text-gray-600">
              Total: {teachers.length}
            </div>
            {selectedTeachers.size > 0 ? (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
              >
                Delete ~ {selectedTeachers.size} Selected
              </button>
            ) : filteredTeachers.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                Select All
              </button>
            )}
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
          {searchQuery && (
            <div className="text-sm text-gray-600 mt-2">
              Searching for "{searchQuery}" â€¢ <span className="font-semibold">{filteredTeachers.length} result{filteredTeachers.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Advisers Table */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                Advisers ({filteredTeachers.filter(t => t.role === 'adviser').length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-yellow-100 text-yellow-800">
                  <tr>
                    <th className="p-3 border text-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
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
                            checked={selectedTeachers.has(teacher.id)}
                            onChange={() => handleSelectTeacher(teacher.id)}
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
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                title="Delete"
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
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="View Credentials"
                              >
                                <KeyIcon className="w-5 h-5" />
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
              <h3 className="text-lg font-semibold text-purple-800 mb-4">
                Subject Teachers ({filteredTeachers.filter(t => t.role === 'subject_teacher').length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-purple-100 text-purple-800">
                  <tr>
                    <th className="p-3 border text-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
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
                            checked={selectedTeachers.has(teacher.id)}
                            onChange={() => handleSelectTeacher(teacher.id)}
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
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                title="Delete"
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
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="View Credentials"
                              >
                                <KeyIcon className="w-5 h-5" />
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
      </div>

      {/* BULK IMPORT MODAL */}
      <TeacherBulkImportModal 
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchTeachers();
          setShowBulkImportModal(false);
        }}
      />

      {/* VIEW TEACHER MODAL */}
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-800">Teacher Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{selectedTeacher.firstName} {selectedTeacher.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{selectedTeacher.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-semibold">{selectedTeacher.position || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class/Section</p>
                <p className="font-semibold">{selectedTeacher.gradeLevel && selectedTeacher.section ? `${selectedTeacher.gradeLevel} - ${selectedTeacher.section}` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-semibold">{selectedTeacher.role === 'subject_teacher' ? 'Subject Teacher' : 'Teacher'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-semibold">{selectedTeacher.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="font-semibold">
                  {(() => {
                    try {
                      if (selectedTeacher.subjects) {
                        // Parse JSON string if it's a string, otherwise use as-is
                        const subjectsArray = typeof selectedTeacher.subjects === 'string' 
                          ? JSON.parse(selectedTeacher.subjects) 
                          : selectedTeacher.subjects;
                          
                        // Filter out empty arrays and join subjects
                        if (Array.isArray(subjectsArray) && subjectsArray.length > 0) {
                          return subjectsArray.join(', ');
                        }
                      }
                      return '-';
                    } catch (error) {
                      console.error('Error parsing subjects:', error);
                      return '-';
                    }
                  })()}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowViewModal(false)}
              className="mt-6 w-full bg-red-800 text-white py-2 rounded-lg hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-800">Edit Teacher</h3>
            </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input 
                  type="text" 
                  value={editFormData.position || ''} 
                  onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                  placeholder="e.g., Grade 3 Adviser"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editFormData.role || ''} 
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                >
                  <option value="">Select Role</option>
                  <option value="teacher">Teacher</option>
                  <option value="subject_teacher">Subject Teacher</option>
                  <option value="adviser">Adviser</option>
                </select>
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
                <select 
                  value={editFormData.section || ''} 
                  onChange={(e) => setEditFormData({...editFormData, section: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                >
                  <option value="">Select Section</option>
                  <option value="Wisdom">Wisdom</option>
                  <option value="Kindness">Kindness</option>
                  <option value="Humility">Humility</option>
                  <option value="Diligence">Diligence</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
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
      {showCredentialsModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6 text-red-800">Teacher Credentials</h3>
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
                  <p className="text-lg font-mono text-gray-900">{selectedTeacher.plainPassword || 'Password123'}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTeacher.plainPassword || 'Password123');
                      toast.success('Password copied to clipboard');
                    }}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
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
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

