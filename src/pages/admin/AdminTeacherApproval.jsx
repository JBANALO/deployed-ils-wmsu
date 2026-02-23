import React, { useState, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import api from "../../api/axiosConfig";
import { toast } from 'react-toastify';

export default function AdminTeacherApproval() {
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchPendingTeachers();
  }, []);

  const fetchPendingTeachers = async () => {
    try {
      const response = await api.get('/users/pending-teachers');
      setPendingTeachers(response.data?.data?.teachers || []);
      setLoading(false);
    } catch (error) {
      toast.error('Error fetching pending teachers: ' + error.message);
      setPendingTeachers([]);
      setLoading(false);
    }
  };

  const handleApprove = async (teacherId) => {
    if (window.confirm('Are you sure you want to approve this teacher?')) {
      try {
        setActionInProgress(true);
        await api.post(`/users/${teacherId}/approve`);
        await fetchPendingTeachers();
        toast.success('Teacher approved successfully!');
      } catch (error) {
        toast.error('Error approving teacher: ' + error.message);
        toast.error('Failed to approve teacher: ' + error.message);
      } finally {
        setActionInProgress(false);
      }
    }
  };

  const handleDeclineClick = (teacher) => {
    setSelectedTeacher(teacher);
    setShowDeclineModal(true);
  };

  const handleDeclineSubmit = async () => {
    if (!selectedTeacher) return;
    
    try {
      setActionInProgress(true);
      await api.post(`/users/${selectedTeacher.id}/decline`, {
        reason: declineReason || 'No reason provided'
      });
      setShowDeclineModal(false);
      setDeclineReason("");
      setSelectedTeacher(null);
      await fetchPendingTeachers();
      toast.success('Teacher declined successfully!');
    } catch (error) {
      toast.error('Error declining teacher: ' + error.message);
      toast.error('Failed to decline teacher: ' + error.message);
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
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Teacher Account Approvals</h2>
        </div>
      </div>

      <p className="text-gray-600 mb-4">
        Review and approve or decline pending teacher registration requests.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 bg-yellow-50 rounded-lg text-center shadow-sm border border-yellow-100">
          <h3 className="text-lg font-semibold text-yellow-800">Pending Requests</h3>
          <p className="text-2xl font-bold">{pendingTeachers.length}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center shadow-sm border border-green-100">
          <h3 className="text-lg font-semibold text-green-800">Total Teachers</h3>
          <p className="text-2xl font-bold">Coming soon</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Declined Requests</h3>
          <p className="text-2xl font-bold">Coming soon</p>
        </div>
      </div>

      {pendingTeachers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No pending teacher approvals at this time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-yellow-100 text-yellow-800">
              <tr>
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Role</th>
                <th className="p-3 border">Position</th>
                <th className="p-3 border">Grade Level</th>
                <th className="p-3 border">Section</th>
                <th className="p-3 border">Applied On</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{teacher.firstName} {teacher.lastName}</td>
                  <td className="p-3 border">{teacher.email}</td>
                  <td className="p-3 border">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                      {teacher.role === 'subject_teacher' ? 'Subject Teacher' : teacher.role === 'adviser' ? 'Adviser' : 'Teacher'}
                    </span>
                  </td>
                  <td className="p-3 border">{teacher.position || '-'}</td>
                  <td className="p-3 border">{teacher.gradeLevel || '-'}</td>
                  <td className="p-3 border">{teacher.section || '-'}</td>
                  <td className="p-3 border text-sm text-gray-500">
                    {new Date(teacher.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(teacher.id)}
                        disabled={actionInProgress}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-semibold flex items-center gap-1 disabled:opacity-70"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeclineClick(teacher)}
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

      {/* DECLINE MODAL */}
      {showDeclineModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircleIcon className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-bold text-red-800">Decline Teacher Request</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Are you sure you want to decline the account request for <strong>{selectedTeacher.firstName} {selectedTeacher.lastName}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Decline (Optional)</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Provide a reason for declining this request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                rows="3"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                  setSelectedTeacher(null);
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
                {actionInProgress ? 'Declining...' : 'Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
