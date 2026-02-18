import React, { useState } from 'react';
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { parseCSVFile, validateStudentData, processStudentData, generateEmail, generateUsername } from '../../utils/csvParser';
import { authService } from '../../api/userService';
import { API_BASE_URL } from '../../api/config';
import QRCode from 'qrcode';

export default function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('upload'); // 'upload', 'preview', 'importing', 'complete'
  const [csvData, setCSVData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importResults, setImportResults] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('Password123');
  const [fileError, setFileError] = useState('');

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/student-import-template.csv';
    link.download = 'student-import-template.csv';
    link.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileError('');
    try {
      let data = await parseCSVFile(file);
      
      // Auto-generate emails for students without email
      data = processStudentData(data);
      
      const validation = validateStudentData(data);

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
    const results = [];

    for (let i = 0; i < csvData.length; i++) {
      const student = csvData[i];
      try {
        // Generate LRN (Learning Record Number) based on timestamp and index
        const timestamp = Date.now();
        const lrn = `${timestamp}${String(i).padStart(4, '0')}`;

        // First, create user account via auth service
        const studentData = {
          firstName: student.firstName,
          lastName: student.lastName,
          username: student.username,
          email: student.email,
          password: defaultPassword,
          confirmPassword: defaultPassword,
          role: 'student',
          gradeLevel: student.gradeLevel,
          section: student.section,
        };

        const authResponse = await authService.register(studentData);

        // Generate QR code for the student
        let qrCodeDataUrl = null;
        const studentId = lrn; // Use LRN as student ID since user ID might not be available
        try {
          const qrData = {
            id: studentId,
            name: `${student.firstName} ${student.lastName}`,
            lrn: lrn,
            gradeLevel: student.gradeLevel,
            section: student.section
          };
          qrCodeDataUrl = await generateQRCode(qrData);
          console.log('QR Code generated successfully for:', student.firstName);
        } catch (qrError) {
          console.error('Error generating QR code for', student.firstName, ':', qrError);
          // Continue even if QR fails - generate a simple text-based QR placeholder
          qrCodeDataUrl = `data:text/plain,LRN:${lrn}`;
        }

        // Now create student record in the database
        const fullStudentRecord = {
          id: studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: `${student.firstName} ${student.lastName}`,
          username: student.username,
          email: student.email,
          password: defaultPassword,
          lrn: lrn,
          qrCode: qrCodeDataUrl,
          sex: student.sex || 'N/A',
          gradeLevel: student.gradeLevel,
          section: student.section,
          parentEmail: student.parentEmail || '',
          parentContact: student.parentContact || '',
          status: 'Active',
          createdAt: new Date().toISOString()
        };

        // Save to students API
        try {
          const apiResponse = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fullStudentRecord)
          });
          
          if (!apiResponse.ok) {
            console.warn('API response not OK:', apiResponse.status);
          }
        } catch (apiError) {
          console.warn('Could not save to students database, but account created:', apiError);
        }

        results.push({
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          lrn: lrn,
          success: true,
          message: 'Account created with QR code'
        });
      } catch (error) {
        console.error('Import error for', student.firstName, ':', error);
        results.push({
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          success: false,
          message: error.message
        });
      }
    }

    setImportResults(results);
    setIsImporting(false);
    setStep('complete');
    
    // Call onSuccess immediately after import completes (don't wait for modal to close)
    if (onSuccess) {
      onSuccess();
    }
  };

  // Function to generate QR code - FIXED
  const generateQRCode = (data) => {
    return new Promise((resolve, reject) => {
      QRCode.toDataURL(JSON.stringify(data), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (err, url) => {
        if (err) {
          console.error('QR Generation error:', err);
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
  };

  const handleClose = () => {
    setStep('upload');
    setCSVData([]);
    setValidationErrors([]);
    setImportResults([]);
    setFileError('');
    onClose();
  };

  const handleFinish = () => {
    handleClose();
    if (onSuccess) onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-red-800 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Bulk Import Students</h2>
          <button
            onClick={handleClose}
            className="hover:bg-red-700 p-1 rounded transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">CSV Format - Email & Username AUTO-GENERATED:</h3>
                <pre className="text-sm bg-white p-2 rounded border border-blue-100 overflow-x-auto">
{`firstName,lastName,email,username,gradeLevel,section
Juan,Dela Cruz,,,Grade 3,Wisdom
Maria,Santos,,,Grade 4,Knowledge

NOTE:
- Email & Username columns can be EMPTY
- Email: auto-generated as firstname.lastname@wmsu.edu.ph
- Username: auto-generated as firstname.lastname`}
                </pre>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 flex items-center gap-2 text-blue-900 hover:underline font-semibold text-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Choose CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Default Password for All Students
                </label>
                <input
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800"
                />
                <p className="text-xs text-gray-500">
                  This password will be used for all imported students. They can change it later.
                </p>
              </div>

              {fileError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  {fileError}
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Errors found:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>❌ {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-green-800 font-semibold">
                  ✅ {csvData.length} students ready to import
                </p>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="p-2 text-left">First Name</th>
                      <th className="p-2 text-left">Last Name</th>
                      <th className="p-2 text-left">Email (Auto)</th>
                      <th className="p-2 text-left">Username (Auto)</th>
                      <th className="p-2 text-left">Grade</th>
                      <th className="p-2 text-left">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((student, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-2">{student.firstName}</td>
                        <td className="p-2">{student.lastName}</td>
                        <td className="p-2 text-xs text-blue-600 font-mono">{student.email}</td>
                        <td className="p-2 text-xs text-blue-600 font-mono">{student.username}</td>
                        <td className="p-2">{student.gradeLevel}</td>
                        <td className="p-2">{student.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleImportAll}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Import {csvData.length} Students
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING */}
          {step === 'importing' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-block animate-spin">
                  <svg className="w-12 h-12 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="mt-4 text-gray-700 font-semibold">
                  Creating accounts for {csvData.length} students...
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE */}
          {step === 'complete' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-blue-800 font-semibold">
                  ℹ️ Import Complete
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {importResults.map((result, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="text-sm flex-1">
                        <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                          {result.name}
                        </p>
                        <p className={result.success ? 'text-green-700 text-xs' : 'text-red-700'}>
                          {result.message}
                        </p>
                        {result.lrn && (
                          <p className="text-xs text-gray-600 mt-1">LRN: {result.lrn}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-100 p-3 rounded-lg text-sm">
                <p className="text-gray-700">
                  <strong>Success:</strong> {importResults.filter(r => r.success).length} / {importResults.length}
                </p>
              </div>

              <button
                onClick={handleFinish}
                className="w-full px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
