import React, { useState } from 'react';
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { parseCSVFile, processTeacherData, validateTeacherData, generateEmail, generateUsername } from '../../utils/csvParser';
import { authService } from '../../api/userService';
import api from '../../api/axiosConfig';
import toast from 'react-hot-toast';

export default function TeacherBulkImportModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('upload'); // 'upload', 'preview', 'importing', 'complete'
  const [csvData, setCSVData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importResults, setImportResults] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('Password123');
  const [fileError, setFileError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  const handleDownloadTemplate = () => {
    // Create teacher CSV template with actual teacher data
    const headers = ['No.', 'First Name', 'Middle Name', 'Last Name', 'Username', 'Email', 'Role', 'Subjects', 'Grade Level', 'Section', 'Created At', 'Updated At'];
    
    // Fetch actual teacher data from database
    const fetchTeacherData = async () => {
      try {
        const response = await api.get('/teachers');
        const teachers = response.data?.data?.teachers || response.data?.teachers || [];
        
        // Function to generate password based on email (same as AdminCreateTeacher)
  const generatePasswordFromEmail = (email) => {
    if (!email || !email.includes('@wmsu.edu.ph')) {
      return 'WMSUILS123'; // Default for bulk imports
    }
    // Extract the part before @wmsu.edu.ph from email (like students use LRN)
    const emailPart = email.replace('@wmsu.edu.ph', '').slice(-4).padStart(4, '0');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `WMSU${emailPart}${randomPart}`;
  };

  // Convert teachers to CSV format with counter instead of database ID
  const csvRows = teachers.map((teacher, index) => [
    index + 1, // Simple counter: 1, 2, 3, etc.
    teacher.firstName || '',
    teacher.middleName || '',
    teacher.lastName || '',
    teacher.username || '',
    teacher.email || '',
    teacher.role || '',
    teacher.subjects || '',
    teacher.gradeLevel || '',
    teacher.section || '',
    teacher.createdAt || '',
    teacher.updatedAt || ''
  ]);
        
        const csvContent = [
          headers.join(','),
          ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
       link.download = 'Teacher_Data_List.csv'; 
        link.click();
        toast.success('Teacher data downloaded successfully');
      } catch (error) {
        toast.error('Failed to download teacher data: ' + error.message);
      }
    };
    
    fetchTeacherData();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileError('');
    try {
      let data = await parseCSVFile(file);
      
      // Process teacher data
      data = processTeacherData(data);
      
      // Validate teacher data
      const validation = validateTeacherData(data);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setCSVData([]);
      } else {
        setCSVData(data);
        setValidationErrors([]);
        setStep('preview');
      }
    } catch (error) {
      setFileError(error.message);
    }
  };

  const handleImportAll = async () => {
    setIsImporting(true);
    setStep('importing');
    
    try {
      console.log('🚀 Starting bulk import with', csvData.length, 'teachers');
      console.log('📊 CSV Data:', csvData);
      
      const response = await api.post('/admin/bulk-import-teachers', {
        teachers: csvData
      });
      
      console.log('✅ Import API Response:', response.data);
      
      const { imported, updated, errors, total } = response.data;
      
      console.log('📈 Import Results:', { imported, updated, errors, total });
      
      setImportResults([
        ...csvData.map((teacher, index) => ({
          row: index + 1,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          status: imported > index ? 'imported' : updated > index ? 'updated' : errors > index ? 'error' : 'pending'
        })),
        { type: 'success', message: `Successfully processed ${total} teachers` }
      ]);
      
      setSuccessCount(imported);
      setStep('complete');
      
      // Close modal and refresh teacher list
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Import error:', error);
      console.error('❌ Error response:', error.response);
      setStep('upload');
      setIsImporting(false);
      toast.error('Import failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReset = () => {
    setStep('upload');
    setCSVData([]);
    setValidationErrors([]);
    setImportResults([]);
    setSuccessCount(0);
    setFileError('');
    setDefaultPassword('Password123');
  };

  const handleClose = () => {
    if (step === 'complete' && successCount > 0) {
      onSuccess();
    }
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center rounded-t-2xl justify-between bg-gradient-to-r from-red-800 to-red-900 text-white p-6 sticky top-0">
          <h2 className="text-2xl font-bold">Teacher Bulk Import (CSV)</h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-red-700 p-2 rounded-full transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div
              className="space-y-6 overflow-y-auto hide-scrollbar scroll-container"
              style={{ maxHeight: 'calc(100vh - 200px)' }} // adjust 200px based on your header/footer
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>📋 Instructions:</strong> Upload a CSV file with teacher data. 
                  You can mark teachers as "subject teachers" to restrict their grade entry permissions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">CSV Format Required:</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
                  <div>No., First Name, Middle Name, Last Name, Username, Email, Password, Role, Subjects, Grade Level, Section, Created At, Updated At</div>
                  <div className="text-xs text-gray-600 mt-2">
                    • No.: Counter (1, 2, 3, etc.)<br />
                    • First Name, Last Name: Required<br />
                    • Middle Name, Username, Email: Optional (will be auto-generated if empty)<br />
                    • Password: Required (use "WMSUILS123" for all imports)<br />
                    • Role: Required ("adviser" or "subject_teacher")<br />
                    • Subjects: Optional (comma-separated list for subject teachers)<br />
                    • Grade Level, Section: Optional<br />
                    • Created At, Updated At: Auto-generated by system
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download CSV Template
              </button>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer"
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-gray-600 font-semibold">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-400">CSV file</p>
              </div>

              {fileError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-semibold">File Error</p>
                    <p className="text-red-700 text-sm">{fileError}</p>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold mb-3">Validation Errors:</p>
                  <ul className="space-y-2">
                    {validationErrors.slice(0, 10).map((error, idx) => (
                      <li key={idx} className="text-red-700 text-sm flex gap-2">
                        <span className="flex-shrink-0">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li className="text-red-600 text-sm font-semibold">
                        ...and {validationErrors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>✓ CSV Valid:</strong> {csvData.length} teachers ready to import
                </p>
                <p className="text-blue-700 text-xs mt-1">
                  All teachers will use password: WMSUILS123
                </p>
              </div>

              <div className="max-h-90 overflow-y-auto hide-scrollbar border border-gray-300 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Role</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Grade/Section</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Subjects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((teacher, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{teacher.firstName} {teacher.lastName}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{teacher.email}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            teacher.role === 'subject_teacher' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {teacher.role === 'subject_teacher' ? 'Subject Teacher' : 'Adviser'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {teacher.gradeLevel && teacher.section 
                            ? `${teacher.gradeLevel} - ${teacher.section}`
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {teacher.subjects && teacher.subjects.length > 0 
                            ? teacher.subjects.join(', ')
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleImportAll}
                  disabled={isImporting}
                  className="flex-1 bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition font-semibold disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : `Import ${csvData.length} Teachers`}
                </button>
              </div>
            </div>
          )}

          {/* IMPORTING STEP */}
          {step === 'importing' && (
            <div className="space-y-4 text-center overflow-hidden">
              <div className="animate-spin">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-800 rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-600 font-semibold">Importing teachers...</p>
              <p className="text-sm text-gray-500">
                Processed: {importResults.length} / {csvData.length}
              </p>
            </div>
          )}

          {/* COMPLETE STEP */}
          {step === 'complete' && (
            <div className="space-y-6">
              <div className={`border rounded-lg p-4 ${
                successCount === csvData.length
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex gap-3">
                  {successCount === csvData.length ? (
                    <CheckIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      successCount === csvData.length ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      Import Complete
                    </p>
                    <p className={`text-sm ${
                      successCount === csvData.length ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      Successfully imported {successCount} out of {csvData.length} teachers
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto hide-scrollbar space-y-3">
                {importResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 p-3 rounded-lg border ${
                      result.status === 'imported' || result.status === 'updated'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {result.status === 'imported' || result.status === 'updated' ? (
                      <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${
                        result.status === 'imported' || result.status === 'updated' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.name}
                      </p>
                      <p className={`text-xs ${
                        result.status === 'imported' || result.status === 'updated' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">
                      {result.role === 'subject_teacher' ? 'Subject Teacher' : 'Adviser'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
