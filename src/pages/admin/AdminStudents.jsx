import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { 
  AcademicCapIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon, 
  QrCodeIcon, 
  EyeIcon,
  ArrowUpTrayIcon,
  KeyIcon
} from "@heroicons/react/24/solid";
import BulkImportModal from "../../components/modals/BulkImportModal";
import { API_BASE_URL } from "../../api/config";

// Helper functions for QR code URL handling
const getQRCodeUrl = (qrCode) => {
  // Use the base URL without /api suffix for static files
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const filename = qrCode.split('/').pop();
  return `${baseUrl}/qrcodes/${filename}`;
};

const getAlternativeQRUrls = (qrCode) => {
  // Use base URL without /api suffix for static files
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const filename = qrCode.split('/').pop();
  
  return [
    `${baseUrl}/qrcodes/${filename}`,
    `${baseUrl}${qrCode}`, // Try the exact database path
  ];
};

export default function AdminStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch students from API
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Try the new backend API first
      const response = await fetch(`${API_BASE_URL}/students`);
      if (response.ok) {
        const data = await response.json();
        const studentsArray = Array.isArray(data) ? data : data.data || [];
        console.log('Raw students data:', studentsArray);
        console.log('Number of students:', studentsArray.length);
        
        // Only show approved students (not pending or rejected)
        const approvedStudents = studentsArray.filter(student => 
          student.status === 'approved' || student.verification_status === 'approved'
        );
        console.log('Approved students:', approvedStudents.length);
        console.log('Approved students details:', approvedStudents);
        setStudents(approvedStudents);
      } else {
        toast('Could not fetch from new API, using empty list', { icon: '⚠️' });
        setStudents([]);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Error fetching students: ' + error.message);
      // Try alternative endpoint if primary fails
      try {
        const altResponse = await fetch(`${API_BASE_URL}/students`);
        if (altResponse.ok) {
          const data = await altResponse.json();
          // Only show approved students
          const approvedStudents = Array.isArray(data) ? data.filter(student => 
            student.status === 'approved' || student.verification_status === 'approved'
          ) : [];
          setStudents(approvedStudents);
        } else {
          setStudents([]);
        }
      } catch (altError) {
        toast.error('Both APIs failed: ' + altError.message);
        setStudents([]);
      }
      setLoading(false);
    }
  };

  // Filter K-3 students (created by admin)
  const k3Students = students.filter(s => {
    const grade = s.gradeLevel;
    console.log('Student:', s.firstName, s.lastName, 'Grade:', grade, 'Type:', typeof grade, 'Status:', s.status);
    
    // More flexible matching for K-3 grade levels
    const isK3 = grade && (
      grade === 'Kindergarten' || 
      grade === 'Grade 1' || 
      grade === 'Grade 2' || 
      grade === 'Grade 3' ||
      grade.includes('Kindergarten') ||
      grade.includes('Grade 1') ||
      grade.includes('Grade 2') ||
      grade.includes('Grade 3') ||
      grade.includes('Kinder') ||
      grade.includes('1') ||
      grade.includes('2') ||
      grade.includes('3')
    );
    
    console.log('Is K-3:', isK3, 'for', s.firstName, s.lastName);
    return isK3;
  });

  // Filter Grade 4-6 students (both pending and approved)
  const g4to6Students = students.filter(s => {
    // More flexible matching for grade levels
    const grade = s.gradeLevel;
    const isG4to6 = grade && (
      grade.includes('Grade 4') || 
      grade.includes('Grade 5') || 
      grade.includes('Grade 6') ||
      grade.includes('4') || 
      grade.includes('5') || 
      grade.includes('6')
    );
    
    // Log each student to debug
    if (s.firstName && (s.firstName.includes('ash') || s.firstName.includes('last'))) {
      console.log('Found target student:', s.firstName, s.lastName, 'Grade:', grade, 'Matches G4-6:', isG4to6);
    }
    
    return isG4to6;
  });

  // Get all unique sections
  const allSections = [...new Set(k3Students.map(s => s.section).filter(Boolean))];

  // Search and filter K-3 students
  const filteredK3Students = k3Students.filter(student => {
    const matchesSearch = searchQuery === '' || 
      (student.fullName && student.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.firstName && student.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lastName && student.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lrn && student.lrn.includes(searchQuery));
    
    const matchesSection = selectedSection === 'All' || student.section === selectedSection;
    
    return matchesSearch && matchesSection;
  });

  // VIEW QR CODE
  const handleViewQR = (student) => {
    setSelectedStudent(student);
    setShowQRModal(true);
  };

  // EDIT STUDENT
  const handleEdit = (student) => {
    setSelectedStudent(student);
    setEditFormData({ ...student });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        toast.success('Student updated successfully!');
        fetchStudents(); // Refresh list
        setShowEditModal(false);
      } else {
        toast.error('Failed to update student: ' + response.statusText);
      }
    } catch (error) {
      toast.error('Error updating student: ' + error.message);
      toast.error('Failed to update student');
    }
  };

  // DELETE STUDENT
  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Student deleted successfully!');
        fetchStudents(); // Refresh list
      } else {
        toast.error('Failed to delete student: ' + response.statusText);
      }
    } catch (error) {
      toast.error('Error deleting student: ' + error.message);
      toast.error('Failed to delete student');
    }
  };

  // VIEW DETAILS
  const handleView = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  // DOWNLOAD QR CODE
  const handleDownloadQR = (student) => {
    const link = document.createElement('a');
    const qrUrl = getQRCodeUrl(student.qrCode);
    
    link.href = qrUrl;
    link.download = `QR_${student.lrn}_${student.fullName}.png`;
    link.click();
  };

  // VIEW CREDENTIALS
  const handleViewCredentials = (student) => {
    setSelectedStudent(student);
    setShowCredentialsModal(true);
  };

  // TOGGLE STUDENT SELECTION
  const toggleStudentSelection = (studentId) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  // TOGGLE SELECT ALL
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredK3Students.map(s => s.id));
      setSelectedStudents(allIds);
      setSelectAll(true);
    }
  };

  // BULK DELETE
  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select students to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedStudents.size} student(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const studentId of selectedStudents) {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          successCount++;
        }
      }
      toast.success(`Successfully deleted ${successCount} student(s)`);
      setSelectedStudents(new Set());
      setSelectAll(false);
      fetchStudents();
    } catch (error) {
      toast.error('Error deleting students: ' + error.message);
      toast.error('Error deleting students');
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex items-center gap-4 mb-4">
          <AcademicCapIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />
          <h2 className="text-5xl pl-5 font-bold text-gray-900">Students Management</h2>
        </div>
      </div>

      <p className="text-gray-600">
        Manage student records, verify accounts, and generate QR codes.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Total Students</h3>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800">Kinder - Grade 3 Students</h3>
          <p className="text-2xl font-bold">{k3Students.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
          <h3 className="text-lg font-semibold text-green-800">Grade 4 - 6 Students</h3>
          <p className="text-2xl font-bold">{g4to6Students.length}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-red-800 mb-2">Student Actions</h3>
        <ul className="list-disc ml-5 text-gray-700 space-y-1">
          <li>Create accounts for Kinder–Grade 6</li>
          <li>Verify Grade 4–6 student self-registration</li>
          <li>Edit student details</li>
          <li>Delete student accounts</li>
          <li>Regenerate or download QR codes</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setShowBulkImportModal(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <ArrowUpTrayIcon className="w-5 h-5" />
          Bulk Import (CSV)
        </button>
        <button
          onClick={() => navigate("/admin/admin/create-k6")}
          className="bg-red-800 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
        >
          + Create Individual Account
        </button>
      </div>

      {/* KINDER TO GRADE 3 STUDENTS TABLE */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-800">
            Kinder to Grade 3 Students (Admin Created) - {filteredK3Students.length} students
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Total: {k3Students.length}
            </div>
            {selectedStudents.size > 0 ? (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
              >
                🗑️ Delete {selectedStudents.size} Selected
              </button>
            ) : filteredK3Students.length > 0 && (
              <button
                onClick={() => {
                  toggleSelectAll();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                📋 Select All
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name or LRN</label>
              <input
                type="text"
                placeholder="Enter student name or LRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
              >
                <option value="All">All Sections</option>
                {allSections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Info */}
          {(searchQuery || selectedSection !== 'All') && (
            <div className="text-sm text-gray-600">
              {searchQuery && <span>Searching for "{searchQuery}" • </span>}
              {selectedSection !== 'All' && <span>Section: {selectedSection} • </span>}
              <span className="font-semibold">{filteredK3Students.length} result{filteredK3Students.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* K-3 STUDENTS TABLE */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              Kinder - Grade 3 Students ({filteredK3Students.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-blue-100 text-blue-800">
                <tr>
                  <th className="p-3 border text-center">
                    <input
                      type="checkbox"
                      checked={selectAll && filteredK3Students.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                      title="Select all students"
                    />
                  </th>
                  <th className="p-3 border">LRN</th>
                  <th className="p-3 border">Name</th>
                  <th className="p-3 border">Sex</th>
                  <th className="p-3 border">Grade</th>
                  <th className="p-3 border">Section</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">QR</th>
                  <th className="p-3 border">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-6 text-center text-gray-500">
                      Loading students...
                    </td>
                  </tr>
                ) : filteredK3Students.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-6 text-center text-gray-500">
                      {searchQuery || selectedSection !== 'All' 
                        ? 'No K-3 students match your search criteria.'
                        : 'No K-3 students found. Create your first student account!'}
                    </td>
                  </tr>
                ) : (
                  filteredK3Students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-3 border text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 border">{student.lrn}</td>
                      <td className="p-3 border font-semibold">
                        {student.fullName || `${student.firstName} ${student.lastName}` || 'N/A'}
                      </td>
                      <td className="p-3 border">{student.sex || 'N/A'}</td>
                      <td className="p-3 border">{student.gradeLevel}</td>
                      <td className="p-3 border">{student.section}</td>
                      <td className="p-3 border">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          {student.status}
                        </span>
                      </td>
                      <td className="p-3 border">
                        <button 
                          onClick={() => handleViewQR(student)}
                          className="p-2 bg-gray-700 text-white rounded-lg hover:bg-black flex items-center gap-1"
                        >
                          <QrCodeIcon className="w-5 h-5" /> View
                        </button>
                      </td>
                      <td className="p-3 border flex gap-3">
                        <button 
                          onClick={() => handleView(student)}
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                          title="View Details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleViewCredentials(student)}
                          className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                          title="View Credentials"
                        >
                          <KeyIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleEdit(student)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          title="Edit Student"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          title="Delete Student"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* GRADE 4-6 STUDENTS TABLE */}
      <div className="mt-10">
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-green-800 mb-4">
                Grade 4-6 Students ({g4to6Students.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-green-100 text-green-800">
                  <tr>
                    <th className="p-3 border text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        title="Select all students"
                      />
                    </th>
                    <th className="p-3 border">LRN</th>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Sex</th>
                    <th className="p-3 border">Grade</th>
                    <th className="p-3 border">Section</th>
                    <th className="p-3 border">Status</th>
                    <th className="p-3 border">QR</th>
                    <th className="p-3 border">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="p-6 text-center text-gray-500">
                        Loading students...
                      </td>
                    </tr>
                  ) : g4to6Students.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-6 text-center text-gray-500">
                        No Grade 4-6 students found.
                      </td>
                    </tr>
                  ) : (
                    g4to6Students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="p-3 border text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 border">{student.lrn}</td>
                        <td className="p-3 border font-semibold">
                          {student.fullName || `${student.firstName} ${student.lastName}` || 'N/A'}
                        </td>
                        <td className="p-3 border">{student.sex || 'N/A'}</td>
                        <td className="p-3 border">{student.gradeLevel}</td>
                        <td className="p-3 border">{student.section}</td>
                        <td className="p-3 border">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            {student.status}
                          </span>
                        </td>
                        <td className="p-3 border">
                          <button 
                            onClick={() => handleViewQR(student)}
                            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-black flex items-center gap-1"
                          >
                            <QrCodeIcon className="w-5 h-5" /> View
                          </button>
                        </td>
                        <td className="p-3 border flex gap-3">
                          <button 
                            onClick={() => handleView(student)}
                            className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            title="View Details"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleViewCredentials(student)}
                            className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            title="View Credentials"
                          >
                            <KeyIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleEdit(student)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            title="Edit Student"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            title="Delete Student"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
                
      {/* QR CODE MODAL */}
      {showQRModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">QR Code - {selectedStudent.fullName}</h3>
            <div className="flex justify-center mb-4">
              {selectedStudent.qrCode ? (
                <img 
                  src={getQRCodeUrl(selectedStudent.qrCode)}
                  alt="QR Code" 
                  className="w-64 h-64 border-4 border-gray-300 rounded-lg"
                  onError={(e) => {
                    console.error('QR Code load error. File path:', selectedStudent.qrCode);
                    console.error('Attempted URL:', e.target.src);
                    
                    // Try the exact database path if static route fails
                    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                    const fallbackUrl = `${baseUrl}${selectedStudent.qrCode}`;
                    
                    if (e.target.src !== fallbackUrl) {
                      console.log('Trying fallback path:', fallbackUrl);
                      e.target.src = fallbackUrl;
                      return;
                    }
                    
                    // If fallback fails, show fallback immediately
                    console.warn('QR code not available, showing fallback');
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22256%22 height=%22256%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22256%22 height=%22256%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%236b7280%22%3EQR Code%3C/text%3E%3Ctext x=%2250%25%22 y=%2260%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22%239ca3af%22%3ENot Available%3C/text%3E%3C/svg%3E';
                  }}
                  onLoad={() => {
                    console.log('QR Code loaded successfully from:', selectedStudent.qrCode);
                  }}
                />
              ) : (
                <div className="w-64 h-64 border-4 border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No QR Code Available</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-gray-600 mb-4">LRN: {selectedStudent.lrn}</p>
            <div className="flex gap-3">
              {selectedStudent.qrCode && (
                <button
                  onClick={() => handleDownloadQR(selectedStudent)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Download QR
                </button>
              )}
              <button
                onClick={() => setShowQRModal(false)}
                className={selectedStudent.qrCode ? 'flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600' : 'w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto hide-scrollbar">
            <h3 className="text-xl font-bold mb-4">Edit Student - {selectedStudent.fullName}</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">First Name</label>
                <input
                  type="text"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section</label>
                <input
                  type="text"
                  value={editFormData.section}
                  onChange={(e) => setEditFormData({...editFormData, section: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Sex</label>
                <select
                  value={editFormData.sex || ''}
                  onChange={(e) => setEditFormData({...editFormData, sex: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-bold text-red-800 mb-3">📧 Parent/Guardian Contact Info</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">Parent/Guardian Email</label>
                    <input
                      type="email"
                      value={editFormData.parentEmail || ''}
                      onChange={(e) => setEditFormData({...editFormData, parentEmail: e.target.value})}
                      placeholder="e.g., parent@gmail.com"
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Parent/Guardian Contact Number</label>
                    <input
                      type="text"
                      value={editFormData.parentContact || ''}
                      onChange={(e) => setEditFormData({...editFormData, parentContact: e.target.value})}
                      placeholder="e.g., 09171234567"
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateStudent}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Student Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">LRN</p>
                  <p className="font-semibold">{selectedStudent.lrn}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Name</p>
                  <p className="font-semibold">{selectedStudent.fullName}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Sex</p>
                  <p className="font-semibold">{selectedStudent.sex}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Grade Level</p>
                  <p className="font-semibold">{selectedStudent.gradeLevel}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Section</p>
                  <p className="font-semibold">{selectedStudent.section}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p className="font-semibold">{selectedStudent.status}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CREDENTIALS MODAL */}
      {showCredentialsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6 text-red-800">Student Credentials</h3>
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name</label>
                <p className="text-lg font-bold text-gray-900">{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                  <p className="text-lg font-mono text-gray-900">{selectedStudent.username}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedStudent.username);
                      toast.success('Username copied to clipboard!');
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
                  <p className="text-sm font-mono text-gray-900 break-all">{selectedStudent.email}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedStudent.email);
                      toast.success('Email copied to clipboard!');
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
                  <p className="text-lg font-mono text-gray-900">{selectedStudent.password}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedStudent.password);
                      toast.success('Password copied to clipboard!');
                    }}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="bg-yellow-100 border border-yellow-400 p-3 rounded mt-4">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Security Note:</strong> These credentials should be shared securely with the student's parents/guardians. Keep them confidential.
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

      {/* BULK IMPORT MODAL */}
      <BulkImportModal 
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchStudents(); // Refresh the students list
        }}
      />
    </div>
  );
}
