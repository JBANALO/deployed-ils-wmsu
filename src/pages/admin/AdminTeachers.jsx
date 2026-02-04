import React, { useState, useEffect } from "react";
import { UsersIcon, CheckIcon, XMarkIcon, PencilSquareIcon, TrashIcon, EyeIcon, ArrowUpTrayIcon, KeyIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import TeacherBulkImportModal from "../../components/modals/TeacherBulkImportModal";
import api from "../../api/axiosConfig";

export default function AdminTeachers() {
  const navigate = useNavigate();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      // Fetch all users and filter for teacher-related roles
      const response = await api.get('/users');
      const allUsers = response.data?.data?.users || response.data?.users || [];
      // Filter for all teacher-related roles
      const teachersList = Array.isArray(allUsers) 
        ? allUsers.filter(user => ['teacher', 'subject_teacher', 'adviser'].includes(user.role))
        : [];
      setTeachers(teachersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
      setLoading(false);
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
          await api.delete(`/users/${teacherId}`);
        }
        setSelectedTeachers(new Set());
        setSelectAll(false);
        await fetchTeachers();
        alert(`Successfully deleted ${selectedTeachers.size} teachers`);
      } catch (error) {
        console.error('Error deleting teachers:', error);
        alert('Failed to delete some teachers');
      }
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await api.delete(`/users/${teacherId}`);
        await fetchTeachers();
        alert('Teacher deleted successfully');
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Failed to delete teacher');
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
      const response = await api.put(`/users/${selectedTeacher.id}`, editFormData);
      
      console.log('Save response:', response.data);
      
      await fetchTeachers();
      setShowEditModal(false);
      alert('Teacher updated successfully');
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert(`Failed to update teacher: ${error.message}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <UsersIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Teachers Management</h2>
        </div>
      </div>

      <p className="text-gray-600 mb-4">
        View, verify, edit, or remove teacher accounts. Assign subjects and classes.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Total Teachers</h3>
          <p className="text-2xl font-bold">{teachers.length}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Subject Teachers</h3>
          <p className="text-2xl font-bold">{teachers.filter(t => t.role === 'subject_teacher').length}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Regular Teachers</h3>
          <p className="text-2xl font-bold">{teachers.filter(t => t.role === 'teacher' || !t.role).length}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">Teacher Actions</h3>
          <ul className="list-disc ml-5 text-gray-700 space-y-1">
            <li>Add new teachers via bulk import (CSV)</li>
            <li>Search and filter teachers</li>
            <li>View teacher details</li>
            <li>Edit teacher information</li>
            <li>Delete teacher accounts (single or bulk)</li>
            <li>Assign subjects for subject teachers</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/create-teacher')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 h-fit"
          >
            <span className="text-lg">+</span>
            Add Teacher
          </button>
          <button
            onClick={() => setShowBulkImportModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 h-fit"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Bulk Import (CSV)
          </button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-800">
            All Teachers - {filteredTeachers.length} teachers
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Total: {teachers.length}
            </div>
            {selectedTeachers.size > 0 ? (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
              >
                ðŸ—‘ï¸ Delete {selectedTeachers.size} Selected
              </button>
            ) : filteredTeachers.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                ðŸ“‹ Select All
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

        {/* Teachers Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-red-100 text-red-800">
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
                <th className="p-3 border">Position</th>
                <th className="p-3 border">Role</th>
                <th className="p-3 border">Class/Section</th>
                <th className="p-3 border">Subjects</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => (
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
                      <span className="font-medium">{teacher.firstName} {teacher.lastName}</span>
                    </td>
                    <td className="p-3 border text-sm text-gray-600">{teacher.email}</td>
                    <td className="p-3 border text-sm">{teacher.position || '-'}</td>
                    <td className="p-3 border">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        teacher.role === 'subject_teacher' 
                          ? 'bg-purple-100 text-purple-800' 
                          : teacher.role === 'adviser'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {teacher.role === 'subject_teacher' ? 'Subject Teacher' : teacher.role === 'adviser' ? 'Adviser' : 'Teacher'}
                      </span>
                    </td>
                    <td className="p-3 border text-sm">
                      {teacher.gradeLevel && teacher.section 
                        ? `${teacher.gradeLevel} - ${teacher.section}`
                        : '-'
                      }
                    </td>
                    <td className="p-3 border text-sm">
                      {teacher.subjectsHandled?.length > 0 
                        ? teacher.subjectsHandled.join(', ')
                        : '-'
                      }
                    </td>
                    <td className="p-3 border flex gap-2">
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    {searchQuery ? 'No teachers found matching your search' : 'No teachers available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-800">Teacher Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
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
                <p className="font-semibold">{selectedTeacher.subjectsHandled?.length > 0 ? selectedTeacher.subjectsHandled.join(', ') : '-'}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-800">Edit Teacher</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                      alert('Username copied to clipboard!');
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
                      alert('Email copied to clipboard!');
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
                      alert('Password copied to clipboard!');
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

