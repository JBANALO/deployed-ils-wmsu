import React, { useState, useEffect } from "react";

import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

import api from "../../api/axiosConfig";

import toast from 'react-hot-toast';



export default function AdminApprovals() {

  const [pendingUsers, setPendingUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);

  const [selectedRole, setSelectedRole] = useState("");

  const [declineReason, setDeclineReason] = useState("");

  const [showApproveModal, setShowApproveModal] = useState(false);

  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const [actionInProgress, setActionInProgress] = useState(false);



  const roleOptions = [

    { value: "student", label: "Student" },

    { value: "subject_teacher", label: "Subject Teacher" },

    { value: "adviser", label: "Adviser" },

  ];



  useEffect(() => {

    fetchPendingUsers();

  }, []);



  const fetchPendingUsers = async () => {

    try {

      const response = await api.get('/users/pending-teachers');

      setPendingUsers(response.data?.data?.teachers || []);

      setLoading(false);

    } catch (error) {

      console.error('Error fetching pending users:', error);

      setPendingUsers([]);

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

      

      // Then approve

      await api.post(`/users/${selectedUser.id}/approve`);

      setShowApproveModal(false);

      setSelectedUser(null);

      setSelectedRole("");

      await fetchPendingUsers();

      alert(`✅ User approved as ${roleOptions.find(r => r.value === selectedRole)?.label}!`);

    } catch (error) {

      console.error('Error approving user:', error);

      alert('Failed to approve user: ' + error.message);

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

      await api.post(`/users/${selectedUser.id}/decline`, {

        reason: declineReason || 'No reason provided'

      });

      setShowDeclineModal(false);

      setDeclineReason("");

      setSelectedUser(null);

      await fetchPendingUsers();

      alert('❌ User declined successfully!');

    } catch (error) {

      console.error('Error declining user:', error);

      alert('Failed to decline user: ' + error.message);

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

          <h2 className="text-5xl pl-5 font-bold text-gray-900">Account Approvals</h2>

        </div>

      </div>



      <p className="text-gray-600 mb-4">

        Review pending accounts and assign roles (Student, Teacher, Adviser) before approving.

      </p>



      <div className="grid grid-cols-3 gap-6">

        <div className="p-4 bg-yellow-50 rounded-lg text-center shadow-sm border border-yellow-100">

          <h3 className="text-lg font-semibold text-yellow-800">Pending Requests</h3>

          <p className="text-2xl font-bold">{pendingUsers.length}</p>

        </div>

        <div className="p-4 bg-blue-50 rounded-lg text-center shadow-sm border border-blue-100">

          <h3 className="text-lg font-semibold text-blue-800">Teachers/Advisers</h3>

          <p className="text-2xl font-bold">{pendingUsers.filter(u => ['subject_teacher', 'adviser'].includes(u.role)).length}</p>

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

        <div className="overflow-x-auto bg-white rounded-lg shadow">

          <table className="w-full text-left border-collapse">

            <thead className="bg-yellow-100 text-yellow-800">

              <tr>

                <th className="p-3 border">Name</th>

                <th className="p-3 border">Email</th>

                <th className="p-3 border">Current Role</th>

                <th className="p-3 border">Position</th>

                <th className="p-3 border">Created On</th>

                <th className="p-3 border">Actions</th>

              </tr>

            </thead>

            <tbody>

              {pendingUsers.map((user) => (

                <tr key={user.id} className="hover:bg-gray-50">

                  <td className="p-3 border font-medium">{user.firstName} {user.lastName}</td>

                  <td className="p-3 border text-sm">{user.email}</td>

                  <td className="p-3 border">

                    <span className={`px-2 py-1 rounded text-sm font-semibold ${

                      user.role === 'subject_teacher' ? 'bg-blue-100 text-blue-800' :

                      user.role === 'adviser' ? 'bg-purple-100 text-purple-800' :

                      'bg-green-100 text-green-800'

                    }`}>

                      {user.role === 'subject_teacher' ? 'Subject Teacher' : 

                       user.role === 'adviser' ? 'Adviser' : 'Student'}

                    </span>

                  </td>

                  <td className="p-3 border text-sm">{user.position || '-'}</td>

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

      )}



      {/* APPROVE MODAL - ROLE SELECTION */}

      {showApproveModal && selectedUser && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">

            <div className="flex items-center gap-3 mb-4">

              <CheckCircleIcon className="w-8 h-8 text-green-600" />

              <h3 className="text-xl font-bold text-green-800">Approve User</h3>

            </div>

            

            <p className="text-gray-700 mb-4">

              <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>

            </p>

            

            <div className="mb-6">

              <label className="block text-sm font-medium text-gray-700 mb-2">

                Assign Role <span className="text-red-600">*</span>

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

                {actionInProgress ? 'Approving...' : 'Approve'}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* DECLINE MODAL */}

      {showDeclineModal && selectedUser && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">

            <div className="flex items-center gap-3 mb-4">

              <XCircleIcon className="w-8 h-8 text-red-600" />

              <h3 className="text-xl font-bold text-red-800">Decline User</h3>

            </div>

            <p className="text-gray-700 mb-4">

              Are you sure you want to decline the account for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?

            </p>

            <div className="mb-4">

              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Decline (Optional)</label>

              <textarea

                value={declineReason}

                onChange={(e) => setDeclineReason(e.target.value)}

                disabled={actionInProgress}

                placeholder="Provide a reason..."

                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 disabled:bg-gray-100"

                rows="3"

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

                disabled={actionInProgress}

                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold disabled:opacity-70"

              >

                {actionInProgress ? 'Declining...' : 'Decline'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

