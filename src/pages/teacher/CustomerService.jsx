import { useState, useEffect } from "react";
import { ChatBubbleBottomCenterIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import api from "../../api/axiosConfig";
import { useAuth } from "../../context/UserContext";

// Grade levels and their corresponding sections and subjects
const gradeLevels = [
  { value: 'Kindergarten', label: 'Kindergarten' },
  { value: 'Grade 1', label: 'Grade 1' },
  { value: 'Grade 2', label: 'Grade 2' },
  { value: 'Grade 3', label: 'Grade 3' },
  { value: 'Grade 4', label: 'Grade 4' },
  { value: 'Grade 5', label: 'Grade 5' },
  { value: 'Grade 6', label: 'Grade 6' }
];

// Sections by grade level (matching the system's section structure)
const sectionsByGrade = {
  'Kindergarten': ['Love'],
  'Grade 1': ['Humility'],
  'Grade 2': ['Kindness'],
  'Grade 3': ['Wisdom', 'Diligence'],
  'Grade 4': ['Prudence', 'Generosity'],
  'Grade 5': ['Courage', 'Justice'],
  'Grade 6': ['Honesty', 'Loyalty', 'Industry']
};

export default function CustomerServicePage() {
  const { adminUser: user } = useAuth();
  const [formData, setFormData] = useState({ 
    teacher_name: "",
    teacher_email: "",
    grade_level: "", 
    section: "",
    subject: "",
    message: "", 
    category: "Other",
    priority: "Medium"
  });
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    messageId: null,
    message: null
  });

  // Handle grade level change to reset section only
  const handleGradeLevelChange = (gradeLevel) => {
    setFormData({ 
      ...formData, 
      grade_level: gradeLevel, 
      section: ""
    });
  };

  // Fetch messages on component mount and set up auto-refresh
  useEffect(() => {
    fetchMessages();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Also refresh when window gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchMessages();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchMessages = async () => {
    if (!user?.id) return;
    
    setFetchLoading(true);
    try {
      const response = await api.get(`/teacher/help-center?teacher_id=${user.id}`);
      if (response.data?.status === 'success') {
        setMessages(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const messageData = {
        teacher_id: user?.id || 'anonymous',
        teacher_name: formData.teacher_name,
        teacher_email: formData.teacher_email,
        grade_level: formData.grade_level,
        section: formData.section,
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        priority: formData.priority
      };

      const response = await api.post('/teacher/help-center', messageData);
      
      if (response.data?.status === 'success') {
        toast.success('Your message has been sent successfully!');
        setFormData({ 
          teacher_name: "", 
          teacher_email: "",
          grade_level: "", 
          section: "", 
          subject: "", 
          message: "", 
          category: "Other", 
          priority: "Medium" 
        });
        fetchMessages(); // Refresh messages list
      } else {
        toast.error(response.data?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
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
      const response = await api.delete(`/teacher/help-center/${deleteModal.messageId}?teacher_id=${user.id}`);
      
      if (response.data?.status === 'success') {
        toast.success('Message deleted successfully');
        fetchMessages();
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

  const statusStyles = {
    Pending: "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Resolved: "bg-green-100 text-green-800",
    Closed: "bg-gray-100 text-gray-800"
  };

  const filteredMessages = filter === "All" 
    ? messages 
    : messages.filter((msg) => msg.status === filter);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const faqs = [
    { question: "How do I reset my password?", answer: "Go to the login page and click 'Forgot Password'." },
    { question: "How can I view student attendance reports?", answer: "Go to Reports page and select the section/date range." },
    { question: "Who do I contact for system issues?", answer: "Send a message using this Help Center form." },
    { question: "How do I edit student grades?", answer: "Go to Edit Grades page, select your class and grade level." },
    { question: "Where can I find my class schedule?", answer: "Check your Dashboard or Class List page for schedule information." }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 flex items-center justify-between print:hidden">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ChatBubbleBottomCenterIcon className="w-10 h-10 text-red-800" />
          Customer Service
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Send us a message</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Your Name</label>
                <input
                  type="text"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                  placeholder={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "Enter your full name"}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Your Email</label>
                <input
                  type="email"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                  value={formData.teacher_email}
                  onChange={(e) => setFormData({ ...formData, teacher_email: e.target.value })}
                  placeholder={user?.email || "Enter your email address"}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Grade Level</label>
                <select
                  className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                  value={formData.grade_level}
                  onChange={(e) => handleGradeLevelChange(e.target.value)}
                  required
                >
                  <option value="">Select Grade Level</option>
                  {gradeLevels.map((grade) => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Section</label>
                <select
                  className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  disabled={!formData.grade_level}
                  required
                >
                  <option value="">Select Section</option>
                  {formData.grade_level && sectionsByGrade[formData.grade_level]?.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Subject you're teaching or having problems with"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Technical">Technical Issue</option>
                <option value="Academic">Academic Question</option>
                <option value="Account">Account Problem</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select
                className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                rows="4"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please explain your problem in detail..."
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-red-800 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-md transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">FAQ</h2>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <details key={idx} className="border-b border-gray-200 pb-2 group">
                  <summary className="cursor-pointer font-medium text-gray-700 flex justify-between items-center">
                    {faq.question}
                    <span className="transition-transform duration-300 group-open:rotate-180">&#9660;</span>
                  </summary>
                  <p className="mt-1 text-gray-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>

            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Recent Messages</h2>
              <button
                onClick={() => setShowMessagesModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0l7.89-5.26a2 2 0 001.11-3.57L12.89 3.38a2 2 0 00-2.22 0L3 8a2 2 0 001.11 3.57z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                View Messages
                {messages.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-white text-red-800 text-xs rounded-full font-bold">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Modal */}
      {showMessagesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchMessages}
                  disabled={fetchLoading}
                  className="flex items-center gap-2 px-3 py-1 bg-red-800 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${fetchLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowMessagesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex gap-3 flex-wrap">
                {["All", "Pending", "In Progress", "Resolved", "Closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                      filter === status
                        ? "bg-red-800 text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {fetchLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-800"></div>
                  <p className="text-gray-500 mt-2">Loading messages...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No messages found for this status.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-red-800 text-white">
                        <th className="px-4 py-2 text-left">Grade</th>
                        <th className="px-4 py-2 text-left">Section</th>
                        <th className="px-4 py-2 text-left">Subject</th>
                        <th className="px-4 py-2 text-left">Category</th>
                        <th className="px-4 py-2 text-left">Priority</th>
                        <th className="px-4 py-2 text-left">Message</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMessages.map((msg) => (
                        <tr key={msg.id} className={msg.id % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="px-4 py-2">{msg.grade_level || '-'}</td>
                          <td className="px-4 py-2">{msg.section || '-'}</td>
                          <td className="px-4 py-2 font-medium">{msg.subject}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              msg.category === 'Technical' ? 'bg-blue-100 text-blue-800' :
                              msg.category === 'Academic' ? 'bg-green-100 text-green-800' :
                              msg.category === 'Account' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {msg.category}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              msg.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                              msg.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                              msg.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {msg.priority}
                            </span>
                          </td>
                          <td className="px-4 py-2 max-w-xs truncate" title={msg.message}>
                            {msg.message}
                          </td>
                          <td className="px-4 py-2 text-sm">{formatDate(msg.created_at)}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-md text-sm font-semibold ${statusStyles[msg.status]}`}>
                              {msg.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteMessage(msg.id, msg)}
                              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm transition-colors border border-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Your Message</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 text-center mb-3">
                Are you sure you want to delete your help center message? This action cannot be undone.
              </p>
              
              {deleteModal.message && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900">Message Details:</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>Subject:</strong> {deleteModal.message.subject}
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>Category:</strong> {deleteModal.message.category}
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>Status:</strong> {deleteModal.message.status}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    <strong>Message:</strong> {deleteModal.message.message}
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
