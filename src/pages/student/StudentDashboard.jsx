import React, { useState, useEffect, useContext } from 'react';
import { Download, Calendar, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StudentTopbar from '@/layouts/student/StudentTopbar'; // ← Use @/ if you have alias, or correct path
import { UserContext } from '@/context/UserContext'; // Import UserContext
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StudentPortal = () => {
  const [activeTab, setActiveTab] = useState('grades');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext); // Get logged-in user from context

  // Get studentId from localStorage user data (stored during login)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const studentId = user?.id || storedUser.id || localStorage.getItem('studentId');

useEffect(() => {
  const fetchPortalData = async () => {
    if (!studentId || studentId === 'null') {
      setLoading(false);
      return;
    }

    try {
      toast.loading('Loading student data...', { id: 'studentData' });
      const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 
               (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
      const res = await fetch(`${baseURL}/students/portal?studentId=${studentId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const result = await res.json();
        
        // Map API response structure to frontend expectations
        if (result.status === 'success' && result.data?.student) {
          const studentData = result.data.student;
          const mappedData = {
            profile: {
              fullName: studentData.fullName || `${studentData.firstName} ${studentData.lastName}`,
              gradeLevel: studentData.gradeLevel,
              section: studentData.section,
              lrn: studentData.lrn,
              finalAverage: studentData.average || 'N/A'
            },
            grades: studentData.grades || []
          };
          setData(mappedData);
          toast.success('Student data loaded successfully!', { id: 'studentData' });
        } else {
          toast('No student data found, but you are logged in correctly', { 
            icon: 'ℹ️',
            id: 'studentData' 
          });
          // Don't throw error, just set empty data to prevent login redirect
          setData({
            profile: {
              fullName: 'Loading...',
              gradeLevel: 'Loading...',
              section: 'Loading...',
              lrn: 'Loading...',
              finalAverage: 'Loading...'
            },
            grades: []
          });
        }
    } catch (err) {
      toast.error('No student data found. Please make sure you are logged in correctly.', { id: 'studentData' });
    } finally {
      setLoading(false);
    }
  };

  fetchPortalData();
}, [studentId]);

  // ← SHOW THIS WHILE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-900 border-t-transparent"></div>
        <p className="text-xl text-gray-700">Loading your portal...</p>
        <p className="text-sm text-gray-500">Student ID: {studentId || 'Not found'}</p>
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-2xl text-red-600 font-bold">No Student Data Found</p>
          <p className="text-gray-600 mt-2">Please make sure you are logged in correctly.</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="mt-4 bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-800"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const { profile, grades = [] } = data;

  // Report card download function
  const downloadReportCard = async () => {
    toast.loading('Generating report card...', { id: 'reportCard' });
    
    try {
      // Create a temporary div for the report card
      const reportCardDiv = document.createElement('div');
      reportCardDiv.style.position = 'absolute';
      reportCardDiv.style.left = '-9999px';
      reportCardDiv.style.width = '210mm';
      reportCardDiv.style.padding = '20mm';
      reportCardDiv.style.backgroundColor = '#ffffff';
      reportCardDiv.style.fontFamily = 'Arial, sans-serif';
      
      // Generate report card HTML
      reportCardDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; color: #7c2d12;">WMSU ILS - Elementary Department</h1>
          <h2 style="margin: 5px 0; font-size: 20px; color: #333333;">Report Card</h2>
          <p style="margin: 5px 0; font-size: 14px; color: #666666;">School Year 2024-2025</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px; font-weight: bold; width: 30%;">Student Name:</td>
              <td style="padding: 5px;">${profile.fullName}</td>
              <td style="padding: 5px; font-weight: bold; width: 20%;">Grade Level:</td>
              <td style="padding: 5px;">${profile.gradeLevel}</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">LRN:</td>
              <td style="padding: 5px;">${profile.lrn}</td>
              <td style="padding: 5px; font-weight: bold;">Section:</td>
              <td style="padding: 5px;">${profile.section}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333333;">Academic Performance</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #dddddd;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: left;">Subject</th>
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: center;">Q1</th>
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: center;">Q2</th>
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: center;">Q3</th>
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: center;">Q4</th>
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: center;">Average</th>
                <th style="padding: 8px; border: 1px solid #dddddd; text-align: center;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${grades.map(grade => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dddddd;">${grade.subject}</td>
                  <td style="padding: 8px; border: 1px solid #dddddd; text-align: center;">${grade.q1 || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #dddddd; text-align: center;">${grade.q2 || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #dddddd; text-align: center;">${grade.q3 || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #dddddd; text-align: center;">${grade.q4 || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #dddddd; text-align: center; font-weight: bold;">${grade.average || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #dddddd; text-align: center;">${grade.remarks || 'Pending'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px; font-weight: bold; width: 30%;">Final Average:</td>
              <td style="padding: 5px; font-size: 18px; font-weight: bold; color: #16a34a;">${profile.finalAverage || 'N/A'}</td>
              <td style="padding: 5px; font-weight: bold; width: 20%;">Date Generated:</td>
              <td style="padding: 5px;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666666;">
          <p>This is a system-generated report card.</p>
          <p>For official purposes, please contact the school administration.</p>
        </div>
      `;
      
      document.body.appendChild(reportCardDiv);
      
      // Convert to canvas and then to PDF
      const canvas = await html2canvas(reportCardDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Force override any problematic CSS
          const clonedElement = clonedDoc.querySelector('div');
          if (clonedElement) {
            clonedElement.style.setProperty('color', '#333333', 'important');
            clonedElement.style.setProperty('background-color', '#ffffff', 'important');
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Download the PDF
      pdf.save(`${profile.fullName.replace(/\s+/g, '_')}_Report_Card.pdf`);
      
      // Clean up
      document.body.removeChild(reportCardDiv);
      
      toast.success('Report card downloaded successfully!', { id: 'reportCard' });
    } catch (error) {
      console.error('Error generating report card:', error);
      toast.error('Failed to generate report card. Please try again.', { id: 'reportCard' });
    }
  };

  return (
    <>
      <StudentTopbar studentName={profile.fullName || 'Student'} gradeLevel={profile.gradeLevel || 'Grade'} />

      <div className="pt-20 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Your existing header, tabs, grades table — all perfect */}
          <div className="bg-gradient-to-r from-red-900 to-red-800 text-white rounded-lg p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-red-900" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profile.gradeLevel} - {profile.section}</h2>
                <p className="text-red-100">Welcome back, <strong>{profile.fullName}</strong></p>
                <p className="text-red-100">LRN: {profile.lrn}</p>
              </div>
            </div>
          </div>

          {/* Tabs & Content */}
          <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow-sm">
            {['grades', 'attendance', 'schedule'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 rounded-md font-medium capitalize transition-all ${
                  activeTab === tab ? 'bg-red-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'grades' ? 'My Grades' : tab === 'attendance' ? 'Attendance' : 'Schedule'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            {activeTab === 'grades' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">My Grades</h3>
                    <p className="text-sm text-gray-600">
                      Final Average: <strong className="text-2xl text-green-600">{profile.finalAverage || 'N/A'}</strong>
                    </p>
                  </div>
                  <button onClick={downloadReportCard} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2">
                    <Download className="w-5 h-5" /> Download Report Card
                  </button>
                </div>

                {grades.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <p className="text-lg">No grades yet. Teachers are still updating!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left">Subject</th>
                          <th className="px-6 py-3 text-center">Q1</th>
                          <th className="px-6 py-3 text-center">Q2</th>
                          <th className="px-6 py-3 text-center">Q3</th>
                          <th className="px-6 py-3 text-center">Q4</th>
                          <th className="px-6 py-3 text-center">Average</th>
                          <th className="px-6 py-3 text-center">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((g, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{g.subject}</td>
                            <td className="px-6 py-4 text-center">{g.q1 || '-'}</td>
                            <td className="px-6 py-4 text-center">{g.q2 || '-'}</td>
                            <td className="px-6 py-4 text-center">{g.q3 || '-'}</td>
                            <td className="px-6 py-4 text-center">{g.q4 || '-'}</td>
                            <td className="px-6 py-4 text-center font-bold text-blue-700">{g.average || 'N/A'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                g.average >= 90 ? 'bg-green-100 text-green-800' :
                                g.average >= 85 ? 'bg-blue-100 text-blue-800' :
                                g.average >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {g.remarks || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentPortal;