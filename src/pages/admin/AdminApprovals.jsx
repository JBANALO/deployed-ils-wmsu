import React, { useState, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosConfig";
import toast from 'react-hot-toast';

export default function AdminApprovals() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [declinedUsers, setDeclinedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" or "declined"
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [userToRestore, setUserToRestore] = useState(null);

  const roleOptions = [
    { value: "student", label: "Student" },
    { value: "subject_teacher", label: "Subject Teacher" },
    { value: "adviser", label: "Adviser" },
  ];

  useEffect(() => {
    fetchPendingUsers();
    fetchDeclinedUsers();
  }, []);

  // Fetch declined users
  const fetchDeclinedUsers = async () => {
    try {
      console.log('Fetching declined users...');
      const [teachersResponse, studentsResponse] = await Promise.all([
        api.get('/teachers/declined'),
        api.get('/students/declined')
      ]);

      console.log('Teachers response:', teachersResponse.data);
      console.log('Students response:', studentsResponse.data);
      console.log('Full declined students response:', JSON.stringify(studentsResponse.data, null, 2));

      const declinedTeachers = teachersResponse.data?.data?.teachers || teachersResponse.data?.teachers || [];
      const declinedStudents = studentsResponse.data?.data?.students || studentsResponse.data?.students || [];
      const allDeclinedUsers = [...declinedTeachers, ...declinedStudents];
      
      console.log('Declined teachers:', declinedTeachers);
      console.log('Declined students:', declinedStudents);
      console.log('All declined users:', allDeclinedUsers);
      
      setDeclinedUsers(allDeclinedUsers);
    } catch (error) {
      console.error('Error fetching declined users:', error);
      setDeclinedUsers([]);
    }
  };

  // Refresh data when page becomes visible (e.g., when navigating back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPendingUsers();
        fetchDeclinedUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Restore declined user
  const handleRestoreUser = async (user) => {
    // Show restore confirmation modal instead of window.confirm
    setUserToRestore(user);
    setShowRestoreModal(true);
  };

  // Confirm restore
  const handleConfirmRestore = async () => {
    if (!userToRestore) return;

    try {
      setActionInProgress(true);

      // Use student-specific route for students, teacher route for teachers
      if (userToRestore.role === 'student') {
        await api.post(`/students/${userToRestore.id}/restore`);
      } else {
        await api.post(`/teachers/${userToRestore.id}/restore`);
      }

      await fetchPendingUsers();
      await fetchDeclinedUsers();
      toast.success(`${userToRestore.first_name || userToRestore.firstName} ${userToRestore.last_name || userToRestore.lastName} restored successfully!`);
      
      // Close modal
      setShowRestoreModal(false);
      setUserToRestore(null);
    } catch (error) {
      console.error('Error restoring user:', error); 
      toast.error('Failed to restore user: ' + error.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Cancel restore
  const handleCancelRestore = () => {
    setShowRestoreModal(false);
    setUserToRestore(null);
  };

  const fetchPendingUsers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('Fetching pending users...');
      const [teachersResponse, studentsResponse] = await Promise.all([
        api.get('/teachers/pending'),
        api.get('/students/pending')
      ]);

      console.log('Pending teachers response:', teachersResponse.data);
      console.log('Pending students response:', studentsResponse.data);
      console.log('Full students response:', JSON.stringify(studentsResponse.data, null, 2));

      const pendingTeachers = teachersResponse.data?.data?.teachers || teachersResponse.data?.teachers || [];
      const pendingStudents = studentsResponse.data?.data?.students || studentsResponse.data?.students || [];
      const allPendingUsers = [...pendingTeachers, ...pendingStudents];
      console.log('Pending teachers:', pendingTeachers);
      console.log('Pending students:', pendingStudents);
      console.log('All pending users:', allPendingUsers);
      setPendingUsers(allPendingUsers);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role || "subject_teacher");
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setActionInProgress(true);

      // Update user role if changed
      if (selectedRole !== selectedUser.role) {
        await api.put(`/users/${selectedUser.id}`, { role: selectedRole });
      }

      // Then approve - use student-specific route for students, teacher route for teachers
      if (selectedRole === 'student') {
        // For students, we need to ensure grade level is set
        const gradeLevel = selectedUser.gradeLevel || prompt('Please enter grade level for this student (e.g., Grade 4, Grade 5, Grade 6):');
        if (!gradeLevel) {
          toast.error('Grade level is required for student approval');
          return;
        }
        await api.post(`/students/${selectedUser.id}/approve`, { gradeLevel });
      } else if (selectedRole === 'adviser' || selectedRole === 'subject_teacher') {
        await api.post(`/teachers/${selectedUser.id}/approve`);
      } else {
        await api.post(`/users/${selectedUser.id}/approve`);
      }
      
      setShowApproveModal(false);
      setSelectedUser(null);
      setSelectedRole("");

      await fetchPendingUsers();
      toast.success(`${selectedUser.firstName} ${selectedUser.lastName} approved as ${roleOptions.find(r => r.value === selectedRole)?.label}!`);
      
      // Redirect to appropriate page after approval
      if (selectedRole === 'student') {
        setTimeout(() => {
          navigate('/admin/admin-students');
        }, 1500); // Delay to allow toast to be seen
      } else if (selectedRole === 'adviser' || selectedRole === 'subject_teacher') {
        setTimeout(() => {
          navigate('/admin/admin-teachers');
        }, 1500); // Delay to allow toast to be seen
      }

    } catch (error) {

      console.error('Error approving user:', error);
      toast.error('Failed to approve user: ' + error.message);

    } finally {

      setActionInProgress(false);

    }

  };

  const handleDeclineClick = (user) => {
    setSelectedUser(user);
    setShowDeclineModal(true);

  };

  const handleDeclineSubmit = async () => {
    if (!selectedUser) return;

    try {

      setActionInProgress(true);

      // Use student-specific route for students, teacher route for teachers
      if (selectedUser.role === 'student') {
        await api.post(`/students/${selectedUser.id}/decline`, {
          reason: declineReason || 'No reason provided'
        });
      } else {
        await api.post(`/teachers/${selectedUser.id}/decline`, {
          reason: declineReason || 'No reason provided'
        });
      }

      setShowDeclineModal(false);
      setDeclineReason("");
      setSelectedUser(null);
      await fetchPendingUsers();
      await fetchDeclinedUsers();
      toast.success(`${selectedUser.firstName} ${selectedUser.lastName} declined successfully!`);
    } catch (error) {
      console.error('Error declining user:', error); 
      toast.error('Failed to decline user: ' + error.message);
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }



  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <ClockIcon className="w-20 h-20 text-yellow-600 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Account Management</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "pending"
                ? "border-b-2 border-red-800 text-red-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending Approvals ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("declined")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "declined"
                ? "border-b-2 border-red-800 text-red-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Declined Accounts ({declinedUsers.length})
          </button>
        </div>
      </div>

      {activeTab === "pending" ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">
              Review pending accounts and assign roles (Student, Teacher, Adviser) before approving.
            </p>
            <button
              onClick={() => fetchPendingUsers(true)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 bg-purple-50 rounded-lg text-center shadow-sm border border-purple-100">
          <h3 className="text-lg font-semibold text-purple-800">Advisers</h3>
          <p className="text-2xl font-bold">{pendingUsers.filter(u => u.role === 'adviser').length}</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg text-center shadow-sm border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800">Subject Teachers</h3>
          <p className="text-2xl font-bold">{pendingUsers.filter(u => u.role === 'subject_teacher').length}</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg text-center shadow-sm border border-green-100">
          <h3 className="text-lg font-semibold text-green-800">Students</h3>
          <p className="text-2xl font-bold">{pendingUsers.filter(u => u.role === 'student').length}</p>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No pending approvals at this time.</p>
        </div>
      ) : (
        <>
          {/* Advisers Table */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">
                  Advisers ({pendingUsers.filter(u => u.role === 'adviser').length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-purple-100 text-purple-800">
                    <tr>
                      <th className="p-3 border text-left">Name</th>
                      <th className="p-3 border text-left">Email</th>
                      <th className="p-3 border text-left">Grade & Section</th>
                      <th className="p-3 border text-left">Created On</th>
                      <th className="p-3 border text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.filter(u => u.role === 'adviser').map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-3 border font-medium">{user.firstName} {user.lastName}</td>
                        <td className="p-3 border text-sm">{user.email}</td>
                        <td className="p-3 border text-sm">
                          {user.gradeLevel && user.section 
                            ? `${user.gradeLevel} - ${user.section}`
                            : '-'
                          }
                        </td>
                        <td className="p-3 border text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveClick(user)}
                              disabled={actionInProgress}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineClick(user)}
                              disabled={actionInProgress}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Subject Teachers Table */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">
                  Subject Teachers ({pendingUsers.filter(u => u.role === 'subject_teacher').length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-blue-100 text-blue-800">
                    <tr>
                      <th className="p-3 border text-left">Name</th>
                      <th className="p-3 border text-left">Email</th>
                      <th className="p-3 border text-left">Grade & Section</th>
                      <th className="p-3 border text-left">Created On</th>
                      <th className="p-3 border text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.filter(u => u.role === 'subject_teacher').map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-3 border font-medium">{user.firstName} {user.lastName}</td>
                        <td className="p-3 border text-sm">{user.email}</td>
                        <td className="p-3 border text-sm">
                          {user.gradeLevel && user.section 
                            ? `${user.gradeLevel} - ${user.section}`
                            : '-'
                          }
                        </td>
                        <td className="p-3 border text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveClick(user)}
                              disabled={actionInProgress}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineClick(user)}
                              disabled={actionInProgress}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  Students ({pendingUsers.filter(u => u.role === 'student').length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-green-100 text-green-800">
                    <tr>
                      <th className="p-3 border text-left">Name</th>
                      <th className="p-3 border text-left">Email</th>
                      <th className="p-3 border text-left">Grade & Section</th>
                      <th className="p-3 border text-left">Created On</th>
                      <th className="p-3 border text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.filter(u => u.role === 'student').map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-3 border font-medium">{user.firstName} {user.lastName}</td>
                        <td className="p-3 border text-sm">{user.wmsuEmail || user.email || 'N/A'}</td>
                        <td className="p-3 border text-sm">
                          {user.gradeLevel && user.section 
                            ? `${user.gradeLevel} - ${user.section}`
                            : '-'
                          }
                        </td>
                        <td className="p-3 border text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveClick(user)}
                              disabled={actionInProgress}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineClick(user)}
                              disabled={actionInProgress}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
        </>
      ) : (
        // Declined Accounts Tab
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">
              Review declined accounts and restore if needed. These accounts can be restored to pending status.
            </p>
            <button
              onClick={() => fetchDeclinedUsers()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {declinedUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 text-lg">No declined accounts at this time.</p>
            </div>
          ) : (
            <>
              {/* Declined Advisers Table */}
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4">
                      Declined Advisers ({declinedUsers.filter(u => u.role === 'adviser').length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-purple-100 text-purple-800">
                        <tr>
                          <th className="p-3 border text-left">Name</th>
                          <th className="p-3 border text-left">Email</th>
                          <th className="p-3 border text-left">Grade & Section</th>
                          <th className="p-3 border text-left">Declined On</th>
                          <th className="p-3 border text-left">Reason</th>
                          <th className="p-3 border text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {declinedUsers.filter(u => u.role === 'adviser').map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="p-3 border font-medium">{user.first_name || user.firstName} {user.last_name || user.lastName}</td>
                            <td className="p-3 border text-sm">{user.email}</td>
                            <td className="p-3 border text-sm">
                              {(user.grade_level || user.gradeLevel) && (user.section || user.section) 
                                ? `${user.grade_level || user.gradeLevel} - ${user.section || user.section}`
                                : '-'
                              }
                            </td>
                            <td className="p-3 border text-sm text-gray-500">
                              {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Invalid date'}
                            </td>
                            <td className="p-3 border text-sm text-gray-600">
                              {user.decline_reason || user.declineReason || 'No reason provided'}
                            </td>
                            <td className="p-3 border">
                              <button
                                onClick={() => handleRestoreUser(user)}
                                disabled={actionInProgress}
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Declined Subject Teachers Table */}
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">
                      Declined Subject Teachers ({declinedUsers.filter(u => u.role === 'subject_teacher').length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-blue-100 text-blue-800">
                        <tr>
                          <th className="p-3 border text-left">Name</th>
                          <th className="p-3 border text-left">Email</th>
                          <th className="p-3 border text-left">Grade & Section</th>
                          <th className="p-3 border text-left">Declined On</th>
                          <th className="p-3 border text-left">Reason</th>
                          <th className="p-3 border text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {declinedUsers.filter(u => u.role === 'subject_teacher').map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="p-3 border font-medium">{user.first_name || user.firstName} {user.last_name || user.lastName}</td>
                            <td className="p-3 border text-sm">{user.email}</td>
                            <td className="p-3 border text-sm">
                              {(user.grade_level || user.gradeLevel) && (user.section || user.section) 
                                ? `${user.grade_level || user.gradeLevel} - ${user.section || user.section}`
                                : '-'
                              }
                            </td>
                            <td className="p-3 border text-sm text-gray-500">
                              {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Invalid date'}
                            </td>
                            <td className="p-3 border text-sm text-gray-600">
                              {user.decline_reason || user.declineReason || 'No reason provided'}
                            </td>
                            <td className="p-3 border">
                              <button
                                onClick={() => handleRestoreUser(user)}
                                disabled={actionInProgress}
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Declined Students Table */}
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">
                      Declined Students ({declinedUsers.filter(u => u.role === 'student').length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-green-100 text-green-800">
                        <tr>
                          <th className="p-3 border text-left">Name</th>
                          <th className="p-3 border text-left">Email</th>
                          <th className="p-3 border text-left">Grade & Section</th>
                          <th className="p-3 border text-left">Declined On</th>
                          <th className="p-3 border text-left">Reason</th>
                          <th className="p-3 border text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {declinedUsers.filter(u => u.role === 'student').map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="p-3 border font-medium">{user.first_name || user.firstName} {user.last_name || user.lastName}</td>
                            <td className="p-3 border text-sm">{user.wmsuEmail || user.email || 'N/A'}</td>
                            <td className="p-3 border text-sm">
                              {(user.grade_level || user.gradeLevel) && (user.section || user.section) 
                                ? `${user.grade_level || user.gradeLevel} - ${user.section || user.section}`
                                : '-'
                              }
                            </td>
                            <td className="p-3 border text-sm text-gray-500">
                              {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Invalid date'}
                            </td>
                            <td className="p-3 border text-sm text-gray-600">
                              {user.decline_reason || user.declineReason || 'No reason provided'}
                            </td>
                            <td className="p-3 border">
                              <button
                                onClick={() => handleRestoreUser(user)}
                                disabled={actionInProgress}
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* APPROVE MODAL - ROLE SELECTION */}
      {showApproveModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-bold text-green-800">Approve User</h3>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Role <span className="text-red-600">*</span>
                {selectedUser && selectedUser.role !== selectedRole && (
                  <span className="ml-2 text-xs text-orange-600 font-medium">
                    (Changing from {selectedUser.role === 'subject_teacher' ? 'Subject Teacher' : selectedUser.role === 'adviser' ? 'Adviser' : selectedUser.role})
                  </span>
                )}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={actionInProgress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-800 disabled:bg-gray-100"
              >
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {selectedRole === 'subject_teacher' && 'Can teach specific subjects in assigned classes'}
                {selectedRole === 'adviser' && 'Class adviser with full class access'}
                {selectedRole === 'student' && 'Student account with access to grades and attendance'}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedUser(null);
                  setSelectedRole("");
                }}
                disabled={actionInProgress}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold disabled:opacity-70"
              >
                Cancel
              </button>

              <button
                onClick={handleApproveSubmit}
                disabled={actionInProgress || !selectedRole}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-70"
              >
                {actionInProgress ? 'Approving...' : `Approve as ${roleOptions.find(r => r.value === selectedRole)?.label || 'User'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE MODAL */}
      {showDeclineModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircleIcon className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-bold text-red-800">Decline User</h3>
            </div>

            <p className="text-gray-700 mb-4">
              Are you sure you want to decline the account for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email})?
              <span className="text-sm text-gray-500">This action cannot be undone.</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Decline <span className="text-red-600">*</span>
                <span className="text-xs text-gray-500">(Required - {200 - (declineReason?.length || 0)} characters)</span>
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                disabled={actionInProgress}
                placeholder="e.g., Account does not meet requirements, duplicate registration, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 disabled:bg-gray-100"
                rows="3"
                maxLength={200}
                required
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                  setSelectedUser(null);
                }}
                disabled={actionInProgress}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineSubmit}
                disabled={actionInProgress || !declineReason}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold disabled:opacity-70"
              >
                {actionInProgress ? 'Declining...' : 'Decline & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {showRestoreModal && userToRestore && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="w-8 h-8 text-blue-600" />
              <h3 className="text-xl font-bold text-blue-800">Restore Account</h3>
            </div>

            <p className="text-gray-700 mb-4">
              Are you sure you want to restore <strong>{userToRestore.first_name || userToRestore.firstName} {userToRestore.last_name || userToRestore.lastName}</strong>?
              <span className="text-sm text-gray-500 block mt-1">This will move them back to pending approvals.</span>
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelRestore}
                disabled={actionInProgress}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={actionInProgress}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-70"
              >
                {actionInProgress ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

