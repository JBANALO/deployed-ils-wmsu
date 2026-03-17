import React, { useState, useEffect } from "react";
import { 
  Cog6ToothIcon, 
  UsersIcon, 
  BookOpenIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  AcademicCapIcon,
  PencilSquareIcon,
  TrashIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function SuperAdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [accounts, setAccounts] = useState({
    admins: [],
    teachers: [],
    students: []
  });
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalAccounts: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [superAdminUser, setSuperAdminUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAccountsData();
    fetchSuperAdminUser();
  }, []);

  const fetchSuperAdminUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.role === 'super_admin') {
            setSuperAdminUser(user);
            return;
          }
        }
        
        const response = await axios.get('/auth/me');
        if (response.data?.user?.role === 'super_admin') {
          setSuperAdminUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
    } catch (error) {
      console.error('Error fetching super admin user:', error);
      setSuperAdminUser({ firstName: 'Super', lastName: 'Admin' });
    }
  };

  const loadAccountsData = async () => {
    try {
      setLoading(true);

      const [usersRes, teachersRes, studentsRes] = await Promise.all([
        axios.get('/users').catch(() => ({ data: {} })),
        axios.get('/teachers').catch(() => ({ data: {} })),
        axios.get('/students').catch(() => ({ data: {} }))
      ]);

      const users = usersRes.data?.data?.users || usersRes.data?.users || usersRes.data?.data || [];
      const teacherRows = teachersRes.data?.data?.teachers || teachersRes.data?.teachers || teachersRes.data?.data || [];
      const studentRows = studentsRes.data?.data || studentsRes.data || [];

      const admins = Array.isArray(users)
        ? users.filter((u) => ['admin', 'super_admin'].includes((u.role || '').toLowerCase()))
        : [];

      const teachers = Array.isArray(teacherRows)
        ? teacherRows.map((t) => ({
            id: t.id,
            firstName: t.firstName || t.first_name || '',
            lastName: t.lastName || t.last_name || '',
            email: t.email || '',
            username: t.username || '',
            role: t.role || 'teacher',
            status: t.status || t.verification_status || 'approved',
            gradeLevel: t.gradeLevel || t.grade_level || '',
            section: t.section || ''
          }))
        : [];

      const students = Array.isArray(studentRows)
        ? studentRows.map((s) => ({
            id: s.id,
            firstName: s.firstName || s.first_name || '',
            lastName: s.lastName || s.last_name || '',
            email: s.email || s.student_email || s.wmsu_email || '',
            username: s.username || '',
            role: 'student',
            status: s.status || 'Active',
            gradeLevel: s.gradeLevel || s.grade_level || '',
            section: s.section || ''
          }))
        : [];
      
      setAccounts({
        admins,
        teachers,
        students
      });
      
      setStats({
        totalAdmins: admins.length,
        totalTeachers: teachers.length,
        totalStudents: students.length,
        totalAccounts: admins.length + teachers.length + students.length
      });
      
    } catch (error) {
      toast.error('Error loading accounts data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account, type) => {
    setSelectedAccount({ ...account, type });
    setShowEditModal(true);
  };

  const handleDeleteAccount = (account, type) => {
    setSelectedAccount({ ...account, type });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedAccount) return;
    
    try {
      let endpoint;
      if (selectedAccount.type === 'admin') {
        endpoint = `/users/${selectedAccount.id}`;
      } else if (selectedAccount.type === 'teacher') {
        endpoint = `/teachers/${selectedAccount.id}`;
      } else {
        endpoint = `/students/${selectedAccount.id}`;
      }
      
      await axios.delete(endpoint);
      
      toast.success(`${selectedAccount.type} account deleted successfully`);
      setShowDeleteModal(false);
      setSelectedAccount(null);
      loadAccountsData();
      
    } catch (error) {
      toast.error('Error deleting account: ' + error.message);
    }
  };

  const getFilteredAccounts = () => {
    let allAccounts = [];
    
    if (selectedRole === 'all' || selectedRole === 'admin') {
      allAccounts = [...allAccounts, ...accounts.admins.map(a => ({ ...a, type: 'admin' }))];
    }
    if (selectedRole === 'all' || selectedRole === 'teacher') {
      allAccounts = [...allAccounts, ...accounts.teachers.map(t => ({ ...t, type: 'teacher' }))];
    }
    if (selectedRole === 'all' || selectedRole === 'student') {
      allAccounts = [...allAccounts, ...accounts.students.map(s => ({ ...s, type: 'student' }))];
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allAccounts = allAccounts.filter(account => 
        (account.firstName && account.firstName.toLowerCase().includes(query)) ||
        (account.lastName && account.lastName.toLowerCase().includes(query)) ||
        (account.email && account.email.toLowerCase().includes(query)) ||
        (account.username && account.username.toLowerCase().includes(query))
      );
    }
    
    return allAccounts;
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldCheckIcon className="w-5 h-5" />;
      case 'teacher':
      case 'subject_teacher':
      case 'adviser': return <AcademicCapIcon className="w-5 h-5" />;
      case 'student': return <UserGroupIcon className="w-5 h-5" />;
      default: return <UsersIcon className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'teacher':
      case 'subject_teacher':
      case 'adviser': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const saveAccountChanges = async () => {
    if (!selectedAccount) return;

    try {
      if (selectedAccount.type === 'admin') {
        await axios.put(`/users/${selectedAccount.id}`, {
          firstName: selectedAccount.firstName,
          lastName: selectedAccount.lastName,
          username: selectedAccount.username,
          email: selectedAccount.email
        });
      } else if (selectedAccount.type === 'teacher') {
        await axios.put(`/teachers/${selectedAccount.id}`, {
          firstName: selectedAccount.firstName,
          lastName: selectedAccount.lastName,
          email: selectedAccount.email
        });
      } else {
        await axios.put(`/students/${selectedAccount.id}`, {
          firstName: selectedAccount.firstName,
          lastName: selectedAccount.lastName,
          email: selectedAccount.email
        });
      }

      toast.success('Account updated successfully');
      setShowEditModal(false);
      loadAccountsData();
    } catch (error) {
      toast.error('Error updating account: ' + error.message);
    }
  };

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-3 md:p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-4">
          <div className="bg-red-100 p-3 md:p-4 rounded-full">
            <ShieldCheckIcon className="w-8 md:w-12 h-8 md:h-12 text-red-800 transition-transform duration-300 hover:scale-105" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl md:text-6xl font-bold text-gray-900">Super Admin Dashboard</h2>
            <p className="text-xs md:text-sm text-gray-400 mt-2">
              Welcome, {superAdminUser ? superAdminUser.username || superAdminUser.email : 'Super Admin'}!
            </p>
            <p className="text-xs md:text-sm text-red-600 mt-1">Account Management & System Oversight</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <main className="md:col-span-12 bg-white rounded-lg shadow p-4 md:p-6 order-1 md:order-2">
          {activeSection === "overview" && (
            <div>
              <h2 className="text-lg md:text-xl font-semibold mb-4">Account Overview</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Admin Accounts</h3>
                    <p className="text-lg md:text-2xl font-bold text-purple-600">
                      {loading ? '...' : stats.totalAdmins}
                    </p>
                  </div>
                  <ShieldCheckIcon className="h-6 md:h-8 w-6 md:w-8 text-purple-500 flex-shrink-0" />
                </div>
                
                <div className="bg-green-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Teachers</h3>
                    <p className="text-lg md:text-2xl font-bold text-green-600">
                      {loading ? '...' : stats.totalTeachers}
                    </p>
                  </div>
                  <AcademicCapIcon className="h-6 md:h-8 w-6 md:w-8 text-green-500 flex-shrink-0" />
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Students</h3>
                    <p className="text-lg md:text-2xl font-bold text-blue-600">
                      {loading ? '...' : stats.totalStudents}
                    </p>
                  </div>
                  <UserGroupIcon className="h-6 md:h-8 w-6 md:w-8 text-blue-500 flex-shrink-0" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Total Accounts</h3>
                    <p className="text-lg md:text-2xl font-bold text-gray-600">
                      {loading ? '...' : stats.totalAccounts}
                    </p>
                  </div>
                  <UsersIcon className="h-6 md:h-8 w-6 md:w-8 text-gray-500 flex-shrink-0" />
                </div>
              </div>

              {/* Filters */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-3">Account Filters</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Accounts</label>
                    <input
                      type="text"
                      placeholder="Search by name, email, or username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="md:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="all">All Accounts</option>
                      <option value="admin">Admins</option>
                      <option value="teacher">Teachers</option>
                      <option value="student">Students</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold">All Accounts</h3>
                  <p className="text-sm text-gray-600">
                    Showing {getFilteredAccounts().length} of {stats.totalAccounts} accounts
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email/Username</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center">
                            <div className="text-gray-500">Loading accounts...</div>
                          </td>
                        </tr>
                      ) : getFilteredAccounts().length > 0 ? (
                        getFilteredAccounts().map((account) => (
                          <tr key={account.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-600">
                                      {account.firstName?.[0]}{account.lastName?.[0]}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {account.firstName} {account.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {account.middleName && `${account.middleName}. `}
                                    {account.gradeLevel && account.section && `${account.gradeLevel} - ${account.section}`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900">{account.email}</div>
                              <div className="text-sm text-gray-500">@{account.username}</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(account.type)}`}>
                                {getRoleIcon(account.type)}
                                <span className="ml-1 capitalize">{account.type}</span>
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                account.status === 'approved' || account.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : account.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {account.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditAccount(account, account.type)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Edit Account"
                                >
                                  <PencilSquareIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(account, account.type)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Account"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center">
                            <div className="text-gray-500">No accounts found</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit {selectedAccount.type} Account</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={selectedAccount.firstName || ''}
                  onChange={(e) => setSelectedAccount({...selectedAccount, firstName: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={selectedAccount.lastName || ''}
                  onChange={(e) => setSelectedAccount({...selectedAccount, lastName: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={selectedAccount.email || ''}
                  onChange={(e) => setSelectedAccount({...selectedAccount, email: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveAccountChanges}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Delete {selectedAccount.type} Account</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the account for <strong>{selectedAccount.firstName} {selectedAccount.lastName}</strong>?
                  This action cannot be undone.
                </p>
              </div>
              <div className="mt-4 flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
