import React, { useState, useEffect } from "react";
import { AcademicCapIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";

export default function TeacherAccounts() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    department: "",
    contactNumber: "",
    employeeId: ""
  });

  useEffect(() => {
    const fetchActiveSchoolYear = async () => {
      try {
        const response = await api.get('/school-years/active');
        const active = response.data?.data || response.data || null;
        if (active?.id) {
          setActiveSchoolYearId(String(active.id));
        }
      } catch (_) {
        // non-blocking
      }
    };

    fetchActiveSchoolYear();
    fetchTeachers();

    const interval = setInterval(() => {
      fetchTeachers(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const normalizeTeacherRecord = (teacher) => ({
    ...teacher,
    firstName: teacher.firstName || teacher.first_name || "",
    lastName: teacher.lastName || teacher.last_name || "",
    status: teacher.status || teacher.verification_status || teacher.approval_status || 'approved',
    role: String(teacher.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  });

  const fetchTeachers = async (silent = false) => {
    try {
      setLoading(true);
      const params = activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : undefined;
      const response = await api.get('/teachers', { params });
      const raw = response.data?.data?.teachers || response.data?.teachers || response.data?.data || [];
      let list = Array.isArray(raw)
        ? raw.map(normalizeTeacherRecord).filter((t) => ['teacher', 'adviser', 'subject_teacher'].includes(t.role))
        : [];

      // Fallback source: some deployments expose teachers under /users only.
      if (list.length === 0) {
        const usersResponse = await api.get('/users', { params });
        const usersRaw = usersResponse.data?.data?.users || usersResponse.data?.users || usersResponse.data?.data || [];
        list = Array.isArray(usersRaw)
          ? usersRaw.map(normalizeTeacherRecord).filter((t) => ['teacher', 'adviser', 'subject_teacher'].includes(t.role))
          : [];
      }

      setTeachers(list);
      if (!silent) {
        toast.success(`Loaded ${list.length} teachers`);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to fetch teacher accounts");
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSchoolYearId) {
      fetchTeachers(true);
    }
  }, [activeSchoolYearId]);

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = `${teacher.firstName} ${teacher.lastName} ${teacher.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || teacher.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      const username = String(formData.email || '').includes('@')
        ? String(formData.email).split('@')[0]
        : (formData.employeeId || `${formData.firstName}${formData.lastName}`).toLowerCase().replace(/\s+/g, '');

      await api.post('/teachers', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: String(formData.email || '').trim().toLowerCase(),
        username,
        password: formData.password,
        role: 'teacher'
      });
      toast.success("Teacher account created successfully");
      setShowCreateModal(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        department: "",
        contactNumber: "",
        employeeId: ""
      });
      fetchTeachers(true);
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast.error(error.response?.data?.message || "Failed to create teacher account");
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/teachers/${selectedTeacher.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: String(formData.email || '').trim().toLowerCase(),
        ...(formData.password ? { password: formData.password } : {})
      });
      toast.success("Teacher account updated successfully");
      setShowEditModal(false);
      setSelectedTeacher(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        department: "",
        contactNumber: "",
        employeeId: ""
      });
      fetchTeachers(true);
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast.error(error.response?.data?.message || "Failed to update teacher account");
    }
  };

  const handleDeleteTeacher = async () => {
    try {
      console.log('🔍 Selected teacher object:', selectedTeacher);
      console.log('🔍 Deleting teacher with ID:', selectedTeacher.id);
      const response = await api.delete(`/teachers/${selectedTeacher.id}`);
      console.log('🔍 Delete response:', response.data);
      toast.success("Teacher account deleted successfully");
      setShowDeleteModal(false);
      setSelectedTeacher(null);
      fetchTeachers(true);
    } catch (error) {
      console.error("Error deleting teacher:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to delete teacher account");
    }
  };

  const handleApproveTeacher = async (teacherId) => {
    try {
      await api.put(`/teachers/${teacherId}/approve`);
      toast.success("Teacher account approved successfully");
      fetchTeachers(true);
    } catch (error) {
      console.error("Error approving teacher:", error);
      toast.error("Failed to approve teacher account");
    }
  };

  const handleRejectTeacher = async (teacherId) => {
    try {
      await api.put(`/teachers/${teacherId}/decline`);
      toast.success("Teacher account rejected successfully");
      fetchTeachers(true);
    } catch (error) {
      console.error("Error rejecting teacher:", error);
      toast.error("Failed to reject teacher account");
    }
  };

  const openEditModal = (teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      password: "",
      department: teacher.department || "",
      contactNumber: teacher.contactNumber || "",
      employeeId: teacher.employeeId || ""
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'pending':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'rejected':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 border-b-red-800 border-b-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AcademicCapIcon className="w-8 h-8 text-red-800" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Accounts</h1>
              <p className="text-gray-600">Manage teacher accounts and approvals</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search teachers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-800"></div>
                    <p className="mt-2 text-gray-500">Loading teacher accounts...</p>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No teacher accounts found</p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {teacher.firstName} {teacher.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{teacher.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.employeeId || "Not assigned"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.department || "Not specified"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.contactNumber || "Not specified"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(teacher.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {teacher.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveTeacher(teacher.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectTeacher(teacher.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Teacher Account</h2>
            <form onSubmit={handleCreateTeacher}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  Create Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Teacher Account</h2>
            <form onSubmit={handleUpdateTeacher}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  Update Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Delete Teacher Account</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the teacher account for "{selectedTeacher?.firstName} {selectedTeacher?.lastName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteTeacher}
                className="flex-1 bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Teacher
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
