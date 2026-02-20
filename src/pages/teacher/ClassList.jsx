import { useState, useEffect } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ViewColumnsIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import QRCode from "qrcode";
import axios from "../../api/axiosConfig";
import toast from 'react-hot-toast';
import ViewStudentModal from '@/components/modals/ViewStudentModal'
import EditStudentModal from '@/components/modals/EditStudentModal'
import DeleteRequestModal from '@/components/modals/DeleteRequestModal'

export default function ClassList() {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [sectionFilter, setSectionFilter] = useState("All Sections");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [gradeOpen, setGradeOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [deleteReason, setDeleteReason] = useState("");

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === "Active").length;
  const averageGrade = students.length > 0 
    ? Math.round(students.reduce((sum, s) => sum + (s.average || 0), 0) / students.length)
    : 0;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch students from the API using axios
      const response = await axios.get('/students');
      const studentData = Array.isArray(response.data.data) 
        ? response.data.data 
        : Array.isArray(response.data) 
        ? response.data 
        : [];
      
      console.log('Students fetched:', studentData.length);
      setStudents(studentData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      student.lrn.includes(search) ||
      student.wmsuEmail.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "All Grades" || student.gradeLevel === gradeFilter;
    const matchesSection = sectionFilter === "All Sections" || student.section === sectionFilter;
    const matchesStatus = statusFilter === "All Status" || student.status === statusFilter;

    return matchesSearch && matchesGrade && matchesSection && matchesStatus;
  });

  const handleView = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setEditFormData({ ...student, profilePic: student.profilePic }); // Added profilePic
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    try {
      const fullName = `${editFormData.firstName || ''} ${editFormData.middleName || ''} ${editFormData.lastName || ''}`.trim();

      const qrData = JSON.stringify({
        lrn: editFormData.lrn,
        name: fullName,
        gradeLevel: editFormData.gradeLevel,
        section: editFormData.section,
        email: editFormData.wmsuEmail
      });

      let newQrCode = editFormData.qrCode;
      const qrNeedsUpdate = 
        editFormData.lrn !== selectedStudent.lrn ||
        fullName !== selectedStudent.fullName ||
        editFormData.gradeLevel !== selectedStudent.gradeLevel ||
        editFormData.section !== selectedStudent.section;

      if (qrNeedsUpdate) {
        newQrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
      }

      const updatedData = {
        ...editFormData,
        fullName,
        qrCode: newQrCode,
        profilePic: editFormData.profilePic  // Send updated photo
      };

      const response = await axios.put(`/students/${selectedStudent.id}`, updatedData);

      if (response.data.success || response.status === 200) {
        toast.success('Student updated successfully!');
        fetchStudents();
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  };

  const handleDeleteRequest = (student) => {
    setSelectedStudent(student);
    setDeleteReason("");
    setShowDeleteRequestModal(true);
  };

  const submitDeleteRequest = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deletion.');
      return;
    }

    try {
      // For now, send delete request to the main API server
      const response = await axios.post('/delete-requests', {
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentLRN: selectedStudent.lrn,
        requestedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : 'Teacher',
        reason: deleteReason,
        requestedAt: new Date().toISOString()
      });

      if (response.data.success || response.status === 200) {
        toast.success('Delete request sent to admin for approval!');
        setShowDeleteRequestModal(false);
        setDeleteReason("");
      } else {
        toast.error('Failed to send delete request');
      }
    } catch (error) {
      console.error('Error submitting delete request:', error);
      // Check if it's a 404 (endpoint doesn't exist), then show a message
      if (error.response?.status === 404) {
        toast.error('Delete request feature coming soon. Please contact admin directly.');
      } else {
        toast.error('Failed to send delete request');
      }
      setShowDeleteRequestModal(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* === PRESERVED: Header === */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ViewColumnsIcon className="w-10 h-10 text-red-800" />
          Manage Students
        </h2>
      </div>

      {/* === PRESERVED: Stats Cards === */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 font-semibold">Total Students</p>
              <h2 className="text-2xl font-bold">{totalStudents}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 font-semibold">Active Students</p>
              <h2 className="text-2xl font-bold">{activeStudents}</h2>
              <p className="text-gray-500 text-sm">
                {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 font-semibold">Average Grade</p>
              <h2 className="text-2xl font-bold">{averageGrade}</h2>
            </div>
          </div>
          <p className="text-green-500 text-sm mt-2">Class performance</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 font-semibold">Attendance Rate</p>
              <h2 className="text-2xl font-bold">92</h2>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-2">This month</p>
        </div>
      </div>

      {/* === PRESERVED: Full Filter Bar === */}
      <div className="bg-white p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search by name, LRN, email..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-1 focus:ring-red-600"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="relative w-48">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            onFocus={() => setGradeOpen(true)}
            onBlur={() => setGradeOpen(false)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 appearance-none"
          >
            <option>All Grades</option>
            <option>Kindergarten</option>
            <option>Grade 1</option>
            <option>Grade 2</option>
            <option>Grade 3</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${gradeOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative w-48">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            onFocus={() => setSectionOpen(true)}
            onBlur={() => setSectionOpen(false)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 appearance-none"
          >
            <option>All Sections</option>
            <option>Love</option>
            <option>Humility</option>
            <option>Kindness</option>
            <option>Diligence</option>
            <option>Wisdom</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${sectionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            onFocus={() => setStatusOpen(true)}
            onBlur={() => setStatusOpen(false)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 appearance-none"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${statusOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

{/* === Clean, No-Scroll Table (Fits Perfectly on One Page) === */}
<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full min-w-max table-auto">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">No.</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">Student Name</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-28">LRN</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-37">Grade & Section</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16">Age</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16">Sex</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">WMSU Email</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-20">Status</th>
          <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-32 text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {loading ? (
          <tr>
            <td colSpan="9" className="text-center py-12 text-gray-500 text-sm">
              Loading students...
            </td>
          </tr>
        ) : filteredStudents.length === 0 ? (
          <tr>
            <td colSpan="9" className="text-center py-12 text-gray-500 text-sm">
              No students found
            </td>
          </tr>
        ) : (
          filteredStudents.map((student, index) => (
            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
              {/* No. */}
              <td className="px-5 py-2 text-sm font-semibold text-gray-900 text-center">
                {index + 1}
              </td>

              {/* Student Name + Avatar */}
              <td className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 text-sm truncate max-w-xs">
                    {student.fullName}
                  </span>
                </div>
              </td>

              {/* LRN */}
              <td className="px-3 py-2 text-sm font-mono text-gray-700">
                {student.lrn}
              </td>

              {/* Grade & Section */}
              <td className="px-3 py-2 text-sm text-gray-700">
                {student.gradeLevel} - {student.section}
              </td>

              {/* Age */}
              <td className="px-3 py-2 text-sm text-center text-gray-700">
                {student.age}
              </td>

              {/* Sex */}
              <td className="px-3 py-2 text-sm text-center text-gray-700">
                {student.sex}
              </td>

              {/* WMSU Email */}
              <td className="px-3 py-2 text-sm text-blue-600 font-mono truncate max-w-xs">
                {student.wmsuEmail}
              </td>

              {/* Status */}
              <td className="px-3 py-2">
                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                  student.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {student.status}
                </span>
              </td>

              {/* Actions */}
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleView(student)}
                    className="text-blue-600 hover:text-blue-800 transition"
                    title="View"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(student)}
                    className="text-green-600 hover:text-green-800 transition"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(student)}
                    className="text-red-600 hover:text-red-800 transition"
                    title="Delete Request"
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

      {/* MODALS */}
      {showViewModal && selectedStudent && (
        <ViewStudentModal student={selectedStudent} onClose={() => setShowViewModal(false)} />
      )}
      {showEditModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          formData={editFormData}
          setFormData={setEditFormData}
          onSave={handleUpdateStudent}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showDeleteRequestModal && selectedStudent && (
        <DeleteRequestModal
          student={selectedStudent}
          reason={deleteReason}
          setReason={setDeleteReason}
          onSubmit={submitDeleteRequest}
          onClose={() => setShowDeleteRequestModal(false)}
        />
      )}
    </div>
  );
}