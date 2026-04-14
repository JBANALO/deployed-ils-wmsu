import React, { useState, useEffect } from "react";
import { ChatBubbleBottomCenterIcon, EnvelopeIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";
import { useAuth } from "../../context/UserContext";

export default function AdminHelpCenter() {
  const { adminUser: user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [filter, setFilter] = useState({ status: 'All', category: 'All', priority: 'All' });
  const [loading, setLoading] = useState(false);
  const [replyModal, setReplyModal] = useState({
    isOpen: false,
    message: null,
    reply: '',
    status: 'In Progress'
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, messageId: null, message: null });
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Fetch messages on component mount and when filters change
  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [filter]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filter.status !== 'All') queryParams.append('status', filter.status);
      if (filter.category !== 'All') queryParams.append('category', filter.category);
      if (filter.priority !== 'All') queryParams.append('priority', filter.priority);

      const response = await api.get(`/admin/help-center?${queryParams.toString()}`);
      if (response.data?.status === 'success') {
        setMessages(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/help-center/stats');
      if (response.data?.status === 'success') {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusUpdate = async (messageId, newStatus) => {
    try {
      const response = await api.put(`/admin/help-center/${messageId}/status`, { status: newStatus });
      
      if (response.data?.status === 'success') {
        toast.success('Status updated successfully');
        fetchMessages();
        fetchStats();
      } else {
        toast.error(response.data?.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteMessage = (messageId, message) => {
    setDeleteModal({
      isOpen: true,
      messageId: messageId,
      message: message
    });
  };

  const confirmDelete = async () => {
    try {
      const response = await api.delete(`/admin/help-center/${deleteModal.messageId}`);
      
      if (response.data?.status === 'success') {
        toast.success('Message deleted successfully');
        fetchMessages();
        fetchStats();
        setDeleteModal({ isOpen: false, messageId: null, message: null });
      } else {
        toast.error(response.data?.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, messageId: null, message: null });
  };

  const handleReply = async () => {
    if (!replyModal.reply.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      const response = await api.put(`/admin/help-center/${replyModal.message.id}/reply`, {
        admin_reply: replyModal.reply,
        admin_id: user.id,
        status: replyModal.status
      });
      
      if (response.data?.status === 'success') {
        toast.success('Reply sent successfully');
        setReplyModal({ isOpen: false, message: null, reply: '' });
        fetchMessages();
        fetchStats();
      } else {
        toast.error(response.data?.message || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error.response?.data?.message || 'Failed to send reply');
    }
  };

  const openReplyModal = (message) => {
    setReplyModal({
      isOpen: true,
      message: message,
      reply: message.admin_reply || '',
      status: message.status || 'In Progress'
    });
  };

  const closeReplyModal = () => {
    setReplyModal({ isOpen: false, message: null, reply: '', status: 'In Progress' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Technical': return 'bg-blue-100 text-blue-800';
      case 'Academic': return 'bg-green-100 text-green-800';
      case 'Account': return 'bg-purple-100 text-purple-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full">
            <ChatBubbleBottomCenterIcon className="w-8 h-8 text-red-800" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
            <p className="text-gray-600">Manage teacher support requests</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <EnvelopeIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <ChatBubbleBottomCenterIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Closed</p>
              <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            >
              <option value="All">All Categories</option>
              <option value="Technical">Technical</option>
              <option value="Academic">Academic</option>
              <option value="Account">Account</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Support Messages</h2>
          <button
            onClick={() => { fetchMessages(); fetchStats(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1 bg-red-800 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-800"></div>
            <p className="text-gray-500 mt-2">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-red-800 text-white">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Teacher</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Grade</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Section</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Subject</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Priority</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {messages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{message.teacher_name}</p>
                        <p className="text-xs text-gray-500">{message.teacher_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {message.grade_level || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {message.section || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{message.subject}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{message.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(message.category)}`}>
                        {message.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(message.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openReplyModal(message)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm transition-colors border border-blue-700"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id, message)}
                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm transition-colors border border-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reply to Support Request</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">From: <span className="font-medium">{replyModal.message.teacher_name}</span></p>
              <p className="text-sm text-gray-600">Grade: <span className="font-medium">{replyModal.message.grade_level || '-'}</span></p>
              <p className="text-sm text-gray-600">Section: <span className="font-medium">{replyModal.message.section || '-'}</span></p>
              <p className="text-sm text-gray-600">Subject: <span className="font-medium">{replyModal.message.subject}</span></p>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-700">{replyModal.message.message}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={replyModal.status}
                onChange={(e) => setReplyModal({ ...replyModal, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Response
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows="4"
                value={replyModal.reply}
                onChange={(e) => setReplyModal({ ...replyModal, reply: e.target.value })}
                placeholder="Enter your response..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeReplyModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Message</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 text-center mb-3">
                Are you sure you want to delete this help center message? This action cannot be undone.
              </p>
              
              {deleteModal.message && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900">Message Details:</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>From:</strong> {deleteModal.message.teacher_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>Subject:</strong> {deleteModal.message.subject}
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>Status:</strong> {deleteModal.message.status}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Delete Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
