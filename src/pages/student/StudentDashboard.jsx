import React, { useState, useEffect, useContext } from 'react';
import { Download, Calendar, BookOpen, X, Printer, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StudentTopbar from '@/layouts/student/StudentTopbar'; // ← Use @/ if you have alias, or correct path
import { UserContext } from '@/context/UserContext'; // Import UserContext
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StudentPortal = () => {
  const [activeTab, setActiveTab] = useState('grades');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [currentSchoolYearId, setCurrentSchoolYearId] = useState(null);
  const { user } = useContext(UserContext); // Get logged-in user from context

  // Get studentId from localStorage user data (stored during login)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const studentId = user?.id || storedUser.id || localStorage.getItem('studentId');

  useEffect(() => {
    const fetchPortalData = async (silent = false) => {
      if (!studentId || studentId === 'null') {
        setLoading(false);
        return;
      }

      try {
        if (!silent) {
          toast.loading('Loading student data...', { id: 'studentData' });
        }
        const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 
                 (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
        const [res, activeSchoolYearRes] = await Promise.all([
          fetch(`${baseURL}/students/portal?studentId=${studentId}`, { credentials: 'include' }),
          fetch(`${baseURL}/school-years/active`, { credentials: 'include' })
        ]);

        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const result = await res.json();
        let activeSchoolYear = null;
        if (activeSchoolYearRes.ok) {
          const activeResult = await activeSchoolYearRes.json();
          activeSchoolYear = activeResult?.data || null;
          const nextSchoolYearId = activeSchoolYear?.id ? String(activeSchoolYear.id) : null;
          if (nextSchoolYearId && currentSchoolYearId && currentSchoolYearId !== nextSchoolYearId) {
            toast('School year has been updated. Showing current year records.', {
              icon: 'ℹ️',
              id: 'schoolYearSwitch'
            });
          }
          setCurrentSchoolYearId(nextSchoolYearId);
        }
          
          // Map API response structure to frontend expectations
          if (result.status === 'success' && result.data?.student) {
            const studentData = result.data.student;
            const mappedData = {
              profile: {
                fullName: studentData.fullName || `${studentData.firstName} ${studentData.lastName}`,
                gradeLevel: studentData.gradeLevel,
                section: studentData.section,
                lrn: studentData.lrn,
                age: studentData.age || '',
                sex: studentData.sex || '',
                finalAverage: studentData.average || 'N/A',
                adviserName: studentData.adviserName || '',
                schoolYearLabel: activeSchoolYear?.label || '',
                principalName: activeSchoolYear?.principal_name || '',
                assistantPrincipalName: activeSchoolYear?.assistant_principal_name || ''
              },
              grades: studentData.grades || [],
              gradeHistory: studentData.gradeHistory || [],
              attendance: studentData.attendance || [],
              attendanceSummary: studentData.attendanceSummary || {},
              schedule: studentData.schedule || [],
              previousScheduleHistory: studentData.previousScheduleHistory || [],
              publishedRankings: studentData.publishedRankings || [],
              publishedRankingLists: studentData.publishedRankingLists || []
            };
            setData(mappedData);
            if (!silent) {
              toast.success('Student data loaded successfully!', { id: 'studentData' });
            }
          } else {
            if (!silent) {
              toast('No student data found, but you are logged in correctly', { 
                icon: 'ℹ️',
                id: 'studentData' 
              });
            }
            // Don't throw error, just set empty data to prevent login redirect
            setData({
              profile: {
                fullName: 'Loading...',
                gradeLevel: 'Loading...',
                section: 'Loading...',
                lrn: 'Loading...',
                finalAverage: 'Loading...',
                schoolYearLabel: '',
                principalName: '',
                assistantPrincipalName: ''
              },
              grades: [],
              gradeHistory: [],
              attendance: [],
              attendanceSummary: {},
              schedule: [],
              previousScheduleHistory: [],
              publishedRankings: [],
              publishedRankingLists: []
            });
          }
      } catch (err) {
        if (!silent) {
          toast.error('No student data found. Please make sure you are logged in correctly.', { id: 'studentData' });
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    };

    fetchPortalData();

    const interval = setInterval(() => {
      fetchPortalData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [studentId, currentSchoolYearId]);

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

  const { profile, grades = [], gradeHistory = [] } = data;

  const publishedRankings = Array.isArray(data?.publishedRankings) ? data.publishedRankings : [];
  const publishedRankingLists = Array.isArray(data?.publishedRankingLists) ? data.publishedRankingLists : [];
  const totalRankingUpdates = publishedRankings.length + publishedRankingLists.length;

  const formatRankingScore = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : 'N/A';
  };

  const getRankingBadgeClass = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800';
    if (rank === 2) return 'bg-gray-200 text-gray-800';
    if (rank === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  // Report card preview function
  const previewReportCard = () => {
    setShowReportCardModal(true);
  };

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
      
      // Generate official WMSU report card HTML matching preview modal
      reportCardDiv.innerHTML = `
        <div style="padding: 20mm; font-family: Arial, sans-serif; color: #000000;">
          <!-- Header Section -->
          <div style="position: relative; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
            <img
              src="/wmsu-logo.jpg"
              alt="WMSU Logo"
              style="position: absolute; left: -58px; top: 16px; width: 100px; height: 100px; object-fit: contain;"
              onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23f0f0f0\\' stroke=\\'%23333\\' stroke-width=\\'2\\'/%3E%3Ctext x=\\'50\\' y=\\'40\\' text-anchor=\\'middle\\' font-family=\\'Arial\\' font-size=\\'12\\' fill=\\'%23333\\'%3EWMSU%3C/text%3E%3Ctext x=\\'50\\' y=\\'55\\' text-anchor=\\'middle\\' font-family=\\'Arial\\' font-size=\\'10\\' fill=\\'%23333\\'%3ELOGO%3C/text%3E%3C/svg%3E';"
            />
            
            <div>
              <h2 style="margin: 0; font-size: 20px; font-weight: bold;">
                WESTERN MINDANAO STATE UNIVERSITY
              </h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.2;">
                College of Teacher Education <br />
                Integrated Laboratory School <br />
                <span style="font-weight: bold;">ELEMENTARY DEPARTMENT</span> <br />
                Zamboanga City
              </p>
              <h3 style="margin: 8px 0 0 0; font-weight: bold;">PUPIL'S PROGRESS REPORT CARD</h3>
              <div style="display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 14px; margin-right: 8px;">School Year ${reportCardSchoolYearLabel}</span>
              </div>
            </div>
          </div>

          <!-- Student Information -->
          <div style="margin-bottom: 24px; font-size: 14px; line-height: 1.5;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: bold; margin-right: 8px;">Name:</span>
              <span style="text-decoration: underline; margin-left: 8px;">${profile.fullName}</span>
            </div>

            <div style="display: flex; flex-wrap; align-items: center; gap: 24px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center;">
                <span style="font-weight: bold; margin-right: 8px;">Age:</span>
                <span style="text-decoration: underline; margin-left: 8px;">${profile.age || ''}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: bold; margin-right: 8px;">Sex:</span>
                <span style="text-decoration: underline; margin-left: 8px;">${profile.sex || ''}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: bold; margin-right: 8px;">Grade:</span>
                <span style="text-decoration: underline; margin-left: 8px;">${profile.gradeLevel}</span>
              </div>
              <div style="display: flex; align-items: center; flex: 1; min-width: 180px;">
                <span style="font-weight: bold; margin-right: 8px;">Section:</span>
                <span style="text-decoration: underline; margin-left: 8px;">${profile.section}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center;">
              <span style="font-weight: bold; margin-right: 8px;">LRN:</span>
              <span style="text-decoration: underline; margin-left: 8px;">${profile.lrn}</span>
            </div>

            <div style="display: flex; align-items: center; margin-top: 4px;">
              <span style="font-weight: bold; margin-right: 8px;">Class Adviser:</span>
              <span style="text-decoration: underline; margin-left: 8px;">${reportCardAdviserName}</span>
            </div>
          </div>

          <!-- Message to Parents -->
          <div style="width: 98%; margin: 0 auto; margin-top: -20px;">
            <p style="font-size: 14px; margin-bottom: 16px; text-align: justify; line-height: 1.5;">
              <span>Dear Parents,</span>
              <span style="display: block; text-indent: 16px;">
                This report card shows the ability and progress of your child has made in the different
                learning areas as well as his/her core values.
              </span>
              <span style="display: block; text-indent: 16px;">
                The school welcomes you should you desire to know more about your child's progress.
              </span>
            </p>
          </div>

          <!-- Learning Progress Header -->
          <h4 style="font-weight: bold; text-align: center; margin-top: -8px; margin-bottom: 4px;">
            REPORT ON LEARNING PROGRESS AND ACHIEVEMENT
          </h4>

          <!-- Grades Table -->
          <div style="overflow-x-auto;">
            <table style="width: 100%; border: 1px solid #333; font-size: 14px; text-align: center;">
              <thead style="background-color: #f5f5f5;">
                <tr>
                  <th rowspan="2" style="border: 1px solid #333; padding: 4px;">Learning Areas</th>
                  <th colspan="4" style="border: 1px solid #333; padding: 4px;">Quarter</th>
                  <th rowspan="2" style="border: 1px solid #333; padding: 4px;">Final Grade</th>
                  <th rowspan="2" style="border: 1px solid #333; padding: 4px;">Remarks</th>
                </tr>
                <tr>
                  <th style="border: 1px solid #333; padding: 4px;">1</th>
                  <th style="border: 1px solid #333; padding: 4px;">2</th>
                  <th style="border: 1px solid #333; padding: 4px;">3</th>
                  <th style="border: 1px solid #333; padding: 4px;">4</th>
                </tr>
              </thead>

              <tbody>
                ${grades.length > 0 ? grades.map((g, i) => `
                  <tr>
                    <td style="border: 1px solid #333; padding: 4px; text-align: left;">${formatReportCardSubject(g.subject)}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${g.q1 || ''}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${g.q2 || ''}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${g.q3 || ''}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${g.q4 || ''}</td>
                    <td style="border: 1px solid #333; padding: 4px; font-weight: bold;">${g.average || ''}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${g.remarks || ''}</td>
                  </tr>
                `).join('') : Array.from({ length: 10 }).map(() => `
                  <tr>
                    ${Array.from({ length: 7 }).map(() => '<td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>').join('')}
                  </tr>
                `).join('')}

                <tr style="background-color: #f5f5f5; font-weight: bold;">
                  <td style="border: 1px solid #333; padding: 4px;"></td>
                  <td colspan="4" style="border: 1px solid #333; padding: 4px; text-align: center;">General Average</td>
                  <td style="border: 1px solid #333; padding: 4px;">
                    ${grades.length > 0 ? computeGeneralAverage() : ''}
                  </td>
                  <td style="border: 1px solid #333; padding: 4px;">${grades.length > 0 ? 'Passed' : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Remedial Classes Section -->
          <div style="margin-top: 24px;">
            <div style="overflow-x-auto;">
              <table style="width: 100%; border: 1px solid #333; font-size: 14px; text-align: center;">
                <thead style="background-color: #f5f5f5;">
                  <tr>
                    <th colspan="1" style="border: 1px solid #333; padding: 4px; text-align: center;">
                      <span style="font-weight: bold;">Remedial Classes</span>
                    </th>
                    <th colspan="4" style="border: 1px solid #333; padding: 4px; text-align: center;">
                      <div style="display: flex; justify-content: flex-start; align-items: center;">
                        <span>Conducted from:</span>
                        <span style="margin-left: 260px;">to:</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th style="border: 1px solid #333; padding: 4px;">Learning Areas</th>
                    <th style="border: 1px solid #333; padding: 4px;">Final Rating</th>
                    <th style="border: 1px solid #333; padding: 4px;">Remedial Class Mark</th>
                    <th style="border: 1px solid #333; padding: 4px;">Recomputed Final Grade</th>
                    <th style="border: 1px solid #333; padding: 4px;">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  ${Array.from({ length: 3 }).map(() => `
                    <tr>
                      ${Array.from({ length: 5 }).map(() => '<td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>').join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Signatures -->
          <div style="margin-top: 48px; display: flex; justify-content: center; gap: 200px; text-align: center; font-size: 14px; width: 100%;">
            <div style="flex: 1; max-width: 300px;">
              <p style="font-weight: bold; text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; line-height: 1.2;">${reportCardPrincipalName}</p>
              <p style="font-size: 12px; line-height: 1.2;">Principal</p>
            </div>
            <div style="flex: 1; max-width: 300px;">
              <p style="font-weight: bold; text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; line-height: 1.2;">${reportCardAssistantPrincipalName}</p>
              <p style="font-size: 12px; line-height: 1.2;">Assistant Principal</p>
            </div>
            <div style="flex: 1; max-width: 300px;">
              <p style="font-weight: bold; text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; line-height: 1.2;">${reportCardAdviserName}</p>
              <p style="font-size: 12px; line-height: 1.2;">Class Adviser</p>
            </div>
          </div>

          <hr style="border: 1px solid #333; margin-top: 60px; margin-bottom: 8px;" /> 

          <!-- Attendance Section -->
          <h2 style="font-size: 20px; font-weight: bold; text-align: center; margin-top: 48px; margin-bottom: 24px;">REPORT ON ATTENDANCE</h2>
          <div style="overflow-x-auto;">
            <table style="width: 100%; border: 1px solid #333; font-size: 14px; text-align: center; margin-bottom: 32px;">
              <thead style="background-color: #f5f5f5;">
                <tr>
                  <th style="border: 1px solid #333; padding: 4px;"></th>
                  ${months.map((month) => `<th style="border: 1px solid #333; padding: 4px;">${month}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #333; padding: 4px; text-align: left;">No. of school days</td>
                  ${months.map(() => '<td style="border: 1px solid #333; padding: 4px;"></td>').join('')}
                </tr>
                <tr>
                  <td style="border: 1px solid #333; padding: 4px; text-align: left;">No. of days present</td>
                  ${months.map(() => '<td style="border: 1px solid #333; padding: 4px;"></td>').join('')}
                </tr>
                <tr>
                  <td style="border: 1px solid #333; padding: 4px; text-align: left;">No. of days absent</td>
                  ${months.map(() => '<td style="border: 1px solid #333; padding: 4px;"></td>').join('')}
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Parent Signatures -->
          <div style="margin-top: 40px; margin-bottom: 60px; text-align: center;">
            <h3 style="font-weight: bold; text-align: center; margin-bottom: 16px;">PARENT / GUARDIAN'S SIGNATURE</h3>
            <div style="line-height: 1.5; font-size: 14px;">
              <p>1<sup>st</sup> Quarter ____________________________________________</p>
              <p>2<sup>nd</sup> Quarter ____________________________________________</p>
              <p>3<sup>rd</sup> Quarter ____________________________________________</p>
              <p>4<sup>th</sup> Quarter ____________________________________________</p>
            </div>
          </div>

          <!-- Certificate of Transfer -->
          <div style="margin-bottom: 40px;">
            <h3 style="font-weight: bold; text-align: center; margin-top: 28px; margin-bottom: 16px;">Certificate of Transfer</h3>
            <div style="font-size: 14px; line-height: 1.5;">
              <p>Admitted in Grade ___________________________ Section ___________________</p>
              <p>Eligible to Admission in Grade __________________________________________</p>
              <p>Approved:</p>
              <div style="margin-top: 32px; display: flex; justify-content: center; gap: 400px; text-align: center; font-size: 14px;">
                <div>
                  <p style="font-weight: bold; text-decoration: underline;">${reportCardPrincipalName}</p>
                  <p>Principal</p>
                </div>
                <div>
                  <p style="font-weight: bold; text-decoration: underline;">______________________</p>
                  <p>Class Adviser</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Cancellation Section -->
          <div style="font-size: 14px;">
            <h3 style="font-weight: bold; text-align: center; margin-bottom: 16px;">
              Cancellation of Eligibility to Transfer
            </h3>

            <p>Admitted in: ___________________________</p>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px;">
              <p>Date: ___________________________</p>

              <div style="text-align: center;">
                <p style="font-weight: bold; text-decoration: underline; line-height: 1.2;">
                  ${reportCardPrincipalName}
                </p>
                <p style="line-height: 1.2;">Principal</p>
              </div>
            </div>
          </div>
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
        ignoreElements: (element) => {
          // Ignore any elements that might have problematic CSS
          return element.tagName === 'STYLE' || element.tagName === 'LINK';
        },
        onclone: (clonedDoc) => {
          // Remove all stylesheets that might contain oklch
          const styleElements = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styleElements.forEach(el => el.remove());
          
          // Force override all CSS to use safe colors
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            el.style.setProperty('color', '#333333', 'important');
            el.style.setProperty('background-color', '#ffffff', 'important');
            el.style.setProperty('border-color', '#dddddd', 'important');
            el.style.setProperty('font-family', 'Arial, sans-serif', 'important');
            
            // Remove any CSS variables or custom properties
            el.style.removeProperty('--tw-bg-opacity');
            el.style.removeProperty('--tw-text-opacity');
            el.style.removeProperty('--tw-border-opacity');
          });
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

  // Format SY even if stored without dash (e.g., 20262027 -> 2026-2027)
  const formatSchoolYearLabel = (label) => {
    const clean = (label || '').trim();
    if (!clean) {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
    if (clean.includes('-')) return clean;

    const digits = clean.replace(/\D/g, '');
    if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
    return clean;
  };

  // Helper function to compute general average
  const computeGeneralAverage = () => {
    if (grades.length === 0) return "";
    const sum = grades.reduce((acc, cur) => acc + (parseFloat(cur.average) || 0), 0);
    return (sum / grades.length).toFixed(2);
  };

  const reportCardAdviserName = profile.adviserName?.trim() || '_______________';
  const reportCardPrincipalName = profile.principalName?.trim() || 'MA. NORA D. LAI, Ed.D, JD';
  const reportCardAssistantPrincipalName = profile.assistantPrincipalName?.trim() || '_______________';
  const reportCardSchoolYearLabel = formatSchoolYearLabel(profile.schoolYearLabel);

  const formatReportCardSubject = (subject = '') => String(subject)
    .replace(/\s*\(Grade\s+\d+\)\s*$/i, '')
    .replace(/\s*\(Kindergarten\)\s*$/i, '')
    .trim();

  const months = [
    "Aug", "Sept", "Oct", "Nov", "Dec",
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Total"
  ];

  // Print report card function
  const handlePrintReportCard = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Generate the complete report card HTML
    const reportCardHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${profile.fullName}</title>
          <style>
            @page {
              margin: 20mm;
              size: A4;
            }
            
            body {
              font-family: Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 20mm;
              font-size: 14px;
              line-height: 1.5;
            }
            
            .no-print {
              display: none !important;
            }
            
            .report-card {
              max-width: 100%;
              margin: 0 auto;
            }
            
            .header {
              position: relative;
              padding-bottom: 16px;
              margin-bottom: 24px;
              text-align: center;
            }
            
            .logo {
              position: absolute;
              left: 0;
              top: 16px;
              width: 100px;
              height: 100px;
              object-fit: contain;
            }
            
            .department-info {
              margin: 0;
              font-size: 14px;
              line-height: 1.2;
            }
            
            .report-title {
              margin: 8px 0 0 0;
              font-weight: bold;
            }
            
            .school-year {
              font-size: 14px;
              margin-right: 8px;
            }
            
            .underline {
              text-decoration: underline;
            }
            
            .student-info {
              margin-bottom: 24px;
            }
            
            .student-info-row {
              display: flex;
              align-items: center;
              margin-bottom: 8px;
            }
            
            .student-info-row span:first-child {
              font-weight: bold;
              margin-right: 8px;
              min-width: 50px;
            }
            
            .student-info-row span:last-child {
              text-decoration: underline;
              margin-left: 8px;
            }
            
            .student-info-flex {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 24px;
              margin-bottom: 8px;
            }
            
            .student-info-flex > div {
              display: flex;
              align-items: center;
            }
            
            .student-info-flex > div span:first-child {
              font-weight: bold;
              margin-right: 8px;
            }
            
            .student-info-flex > div span:last-child {
              text-decoration: underline;
              margin-left: 8px;
            }
            
            .message-to-parents {
              width: 98%;
              margin: 0 auto;
              margin-top: -20px;
              text-align: justify;
              margin-bottom: 16px;
            }
            
            .message-to-parents span {
              display: block;
              text-indent: 16px;
            }
            
            .section-header {
              font-weight: bold;
              text-align: center;
              margin-top: -8px;
              margin-bottom: 4px;
            }
            
            table {
              width: 100%;
              border: 1px solid #333;
              text-align: center;
              font-size: 14px;
              margin-bottom: 24px;
            }
            
            th, td {
              border: 1px solid #333;
              padding: 4px;
            }
            
            thead {
              background-color: #f5f5f5;
            }
            
            .general-average {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            .signatures {
              margin-top: 48px;
              display: flex;
              justify-content: center;
              gap: 320px;
              text-align: center;
            }
            
            .signatures p:first-child {
              font-weight: bold;
              text-decoration: underline;
            }
            
            hr {
              border: 1px solid #333;
              margin-top: 60px;
              margin-bottom: 8px;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 20mm;
              }
              
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-card">
            <!-- Header Section -->
            <div style="position: relative; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
              <img
                src="/wmsu-logo.jpg"
                alt="WMSU Logo"
                style="position: absolute; left: -58px; top: 16px; width: 100px; height: 100px; object-fit: contain;"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <span style="position: absolute; left: -58px; top: 16px; width: 100px; height: 100px; background-color: #f0f0f0; display: none; align-items: center; justify-content: center; border: 2px solid #333;">
                <span style="font-size: 12px; text-align: center;">WMSU<br>LOGO</span>
              </span>
              
              <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">
                  WESTERN MINDANAO STATE UNIVERSITY
                </h2>
                <p style="margin: 0; font-size: 14px; line-height: 1.2;">
                  College of Teacher Education <br />
                  Integrated Laboratory School <br />
                  <span style="font-weight: bold;">ELEMENTARY DEPARTMENT</span> <br />
                  Zamboanga City
                </p>
                <h3 style="margin: 8px 0 0 0; font-weight: bold;">PUPIL'S PROGRESS REPORT CARD</h3>
                <div style="display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 14px; margin-right: 8px;">School Year ${reportCardSchoolYearLabel}</span>
                </div>
              </div>
            </div>

            <!-- Student Information -->
            <div class="student-info">
              <div class="student-info-row">
                <span>Name:</span>
                <span class="underline">${profile.fullName}</span>
              </div>

              <div class="student-info-flex">
                <div>
                  <span>Age:</span>
                  <span class="underline">${profile.age || ''}</span>
                </div>
                <div>
                  <span>Sex:</span>
                  <span class="underline">${profile.sex || ''}</span>
                </div>
                <div>
                  <span>Grade:</span>
                  <span class="underline">${profile.gradeLevel}</span>
                </div>
                <div>
                  <span>Section:</span>
                  <span class="underline">${profile.section}</span>
                </div>
              </div>

              <div class="student-info-row">
                <span>LRN:</span>
                <span class="underline">${profile.lrn}</span>
              </div>

              <div class="student-info-row">
                <span>Class Adviser:</span>
                <span class="underline">${reportCardAdviserName}</span>
              </div>
            </div>

            <!-- Message to Parents -->
            <div class="message-to-parents">
              <p>
                <span>Dear Parents,</span>
                <span>This report card shows the ability and progress of your child has made in the different learning areas as well as his/her core values.</span>
                <span>The school welcomes you should you desire to know more about your child's progress.</span>
              </p>
            </div>

            <!-- Learning Progress Header -->
            <h4 class="section-header">REPORT ON LEARNING PROGRESS AND ACHIEVEMENT</h4>

            <!-- Grades Table -->
            <div style="overflow-x-auto;">
              <table style="width: 100%; border: 1px solid #333; font-size: 14px; text-align: center;">
                <thead style="background-color: #f5f5f5;">
                  <tr>
                    <th rowspan="2" style="border: 1px solid #333; padding: 4px;">Learning Areas</th>
                    <th colspan="4" style="border: 1px solid #333; padding: 4px;">Quarter</th>
                    <th rowspan="2" style="border: 1px solid #333; padding: 4px;">Final Grade</th>
                    <th rowspan="2" style="border: 1px solid #333; padding: 4px;">Remarks</th>
                  </tr>
                  <tr>
                    <th style="border: 1px solid #333; padding: 4px;">1</th>
                    <th style="border: 1px solid #333; padding: 4px;">2</th>
                    <th style="border: 1px solid #333; padding: 4px;">3</th>
                    <th style="border: 1px solid #333; padding: 4px;">4</th>
                  </tr>
                </thead>

                <tbody>
                  ${grades.length > 0 ? grades.map((g) => `
                    <tr>
                      <td style="border: 1px solid #333; padding: 4px; text-align: left;">${formatReportCardSubject(g.subject)}</td>
                      <td style="border: 1px solid #333; padding: 4px;">${g.q1 || ''}</td>
                      <td style="border: 1px solid #333; padding: 4px;">${g.q2 || ''}</td>
                      <td style="border: 1px solid #333; padding: 4px;">${g.q3 || ''}</td>
                      <td style="border: 1px solid #333; padding: 4px;">${g.q4 || ''}</td>
                      <td style="border: 1px solid #333; padding: 4px; font-weight: bold;">${g.average || ''}</td>
                      <td style="border: 1px solid #333; padding: 4px;">${g.remarks || ''}</td>
                    </tr>
                  `).join('') : Array.from({ length: 10 }).map(() => `
                    <tr>
                      ${Array.from({ length: 7 }).map(() => '<td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>').join('')}
                    </tr>
                  `).join('')}

                  <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td style="border: 1px solid #333; padding: 4px;"></td>
                    <td colspan="4" style="border: 1px solid #333; padding: 4px; text-align: center;">General Average</td>
                    <td style="border: 1px solid #333; padding: 4px;">
                      ${grades.length > 0 ? computeGeneralAverage() : ''}
                    </td>
                    <td style="border: 1px solid #333; padding: 4px;">${grades.length > 0 ? 'Passed' : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Remedial Classes Section -->
            <div style="margin-top: 24px;">
              <div style="overflow-x-auto;">
                <table style="width: 100%; border: 1px solid #333; font-size: 14px; text-align: center;">
                  <thead style="background-color: #f5f5f5;">
                    <tr>
                      <th colspan="1" style="border: 1px solid #333; padding: 4px; text-align: center;">
                        <span style="font-weight: bold;">Remedial Classes</span>
                      </th>
                      <th colspan="4" style="border: 1px solid #333; padding: 4px; text-align: center;">
                        <div style="display: flex; justify-content: flex-start; align-items: center;">
                          <span>Conducted from:</span>
                          <span style="margin-left: 260px;">to:</span>
                        </div>
                      </th>
                    </tr>
                    <tr>
                      <th style="border: 1px solid #333; padding: 4px;">Learning Areas</th>
                      <th style="border: 1px solid #333; padding: 4px;">Final Rating</th>
                      <th style="border: 1px solid #333; padding: 4px;">Remedial Class Mark</th>
                      <th style="border: 1px solid #333; padding: 4px;">Recomputed Final Grade</th>
                      <th style="border: 1px solid #333; padding: 4px;">Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${Array.from({ length: 3 }).map(() => `
                      <tr>
                        ${Array.from({ length: 5 }).map(() => '<td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>').join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Attendance Section -->
            <h2 style="font-size: 20px; font-weight: bold; text-align: center; margin-top: 48px; margin-bottom: 24px;">REPORT ON ATTENDANCE</h2>
            <div style="overflow-x-auto;">
              <table style="width: 100%; border: 1px solid #333; font-size: 14px; text-align: center;">
                <thead style="background-color: #f5f5f5;">
                  <tr>
                    <th style="border: 1px solid #333; padding: 4px;"></th>
                    ${months.map((month) => `<th style="border: 1px solid #333; padding: 4px;">${month}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="border: 1px solid #333; padding: 4px; text-align: left;">No. of school days</td>
                    ${months.map(() => '<td style="border: 1px solid #333; padding: 4px;">&nbsp;</td>').join('')}
                  </tr>
                  <tr>
                    <td style="border: 1px solid #333; padding: 4px; text-align: left;">No. of days present</td>
                    ${months.map(() => '<td style="border: 1px solid #333; padding: 4px;">&nbsp;</td>').join('')}
                  </tr>
                  <tr>
                    <td style="border: 1px solid #333; padding: 4px; text-align: left;">No. of days absent</td>
                    ${months.map(() => '<td style="border: 1px solid #333; padding: 4px;">&nbsp;</td>').join('')}
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Signatures -->
            <div style="margin-top: 48px; display: flex; justify-content: center; gap: 200px; text-align: center; font-size: 14px; width: 100%;">
              <div style="flex: 1; max-width: 300px;">
                <p style="font-weight: bold; text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; line-height: 1.2;">${reportCardPrincipalName}</p>
                <p style="font-size: 12px; line-height: 1.2;">Principal</p>
              </div>
              <div style="flex: 1; max-width: 300px;">
                <p style="font-weight: bold; text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; line-height: 1.2;">${reportCardAssistantPrincipalName}</p>
                <p style="font-size: 12px; line-height: 1.2;">Assistant Principal</p>
              </div>
              <div style="flex: 1; max-width: 300px;">
                <p style="font-weight: bold; text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; line-height: 1.2;">${reportCardAdviserName}</p>
                <p style="font-size: 12px; line-height: 1.2;">Class Adviser</p>
              </div>
            </div>

            <hr style="border: 1px solid #333; margin-top: 60px; margin-bottom: 8px;" />

            <!-- Parent Signatures -->
            <div style="margin-top: 40px; margin-bottom: 60px; text-align: center;">
              <h3 style="font-weight: bold; text-align: center; margin-bottom: 16px;">PARENT / GUARDIAN'S SIGNATURE</h3>
              <div style="space-y: 12px; text-align: center;">
                <p>1<sup>st</sup> Quarter ____________________________________________</p>
                <p>2<sup>nd</sup> Quarter ____________________________________________</p>
                <p>3<sup>rd</sup> Quarter ____________________________________________</p>
                <p>4<sup>th</sup> Quarter ____________________________________________</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Write the HTML to the new window
    printWindow.document.write(reportCardHTML);
    printWindow.document.close();
    
    // Wait for the content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
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
                <p className="text-red-100">School Year: {reportCardSchoolYearLabel}</p>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRankingModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2"
                    >
                      <Trophy className="w-5 h-5" /> View Ranking
                    </button>
                    <button onClick={() => previewReportCard()} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2">
                      <Download className="w-5 h-5" /> Preview Report Card
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  {totalRankingUpdates > 0
                    ? `${totalRankingUpdates} ranking update(s) posted by your teacher.`
                    : 'No ranking has been posted yet. Tap View Ranking to check updates.'}
                </p>

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

                {gradeHistory.length > 0 && (
                  <div className="mt-10">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">Previous Grade Records</h4>
                    <div className="space-y-6">
                      {gradeHistory.map((record, idx) => (
                        <div key={`${record.gradeLevel || 'grade'}-${idx}`} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <p className="font-semibold text-gray-800">
                              {record.gradeLevel || 'Previous Grade'}
                              {record.section ? ` - ${record.section}` : ''}
                              {record.schoolYearLabel ? ` (${record.schoolYearLabel})` : ''}
                            </p>
                            {record.promotedAt && (
                              <p className="text-xs text-gray-500">
                                Promoted on {new Date(record.promotedAt).toLocaleDateString('en-US')}
                              </p>
                            )}
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left">Subject</th>
                                  <th className="px-4 py-2 text-center">Q1</th>
                                  <th className="px-4 py-2 text-center">Q2</th>
                                  <th className="px-4 py-2 text-center">Q3</th>
                                  <th className="px-4 py-2 text-center">Q4</th>
                                  <th className="px-4 py-2 text-center">Average</th>
                                  <th className="px-4 py-2 text-center">Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(record.grades || []).map((g, subIdx) => (
                                  <tr key={`${g.subject}-${subIdx}`} className="border-b">
                                    <td className="px-4 py-2 font-medium">{g.subject}</td>
                                    <td className="px-4 py-2 text-center">{g.q1 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{g.q2 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{g.q3 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{g.q4 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{g.average || 'N/A'}</td>
                                    <td className="px-4 py-2 text-center">{g.remarks || 'Pending'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">My Attendance</h3>
                    <p className="text-sm text-gray-600">
                      View your attendance records throughout the school year
                    </p>
                  </div>
                </div>

                {/* Attendance Summary by Month */}
                {data.attendanceSummary && Object.keys(data.attendanceSummary).some(m => 
                  data.attendanceSummary[m].present > 0 || data.attendanceSummary[m].absent > 0
                ) ? (
                  <div className="overflow-x-auto mb-8">
                    <table className="w-full border border-gray-300 text-sm text-center">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 px-3 py-2"></th>
                          {months.map((month, i) => (
                            <th key={i} className="border border-gray-300 px-2 py-2 text-xs">{month}</th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-left font-medium">Days Present</td>
                          {months.map((month, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-2 text-green-600 font-medium">
                              {data.attendanceSummary[month]?.present || '-'}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 font-bold text-green-700">
                            {months.reduce((sum, m) => sum + (data.attendanceSummary[m]?.present || 0), 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-left font-medium">Days Absent</td>
                          {months.map((month, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-2 text-red-600 font-medium">
                              {data.attendanceSummary[month]?.absent || '-'}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 font-bold text-red-700">
                            {months.reduce((sum, m) => sum + (data.attendanceSummary[m]?.absent || 0), 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-left font-medium">Days Late</td>
                          {months.map((month, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-2 text-yellow-600 font-medium">
                              {data.attendanceSummary[month]?.late || '-'}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 font-bold text-yellow-700">
                            {months.reduce((sum, m) => sum + (data.attendanceSummary[m]?.late || 0), 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {/* Recent Attendance Records */}
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Recent Attendance Records</h4>
                {data.attendance && data.attendance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-center">Time</th>
                          <th className="px-6 py-3 text-center">Period</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attendance.slice(0, 20).map((att, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">
                              {new Date(att.date).toLocaleDateString('en-US', { 
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                              })}
                            </td>
                            <td className="px-6 py-4 text-center">{att.time || '-'}</td>
                            <td className="px-6 py-4 text-center">{att.period || '-'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                att.status?.toLowerCase() === 'present' ? 'bg-green-100 text-green-800' :
                                att.status?.toLowerCase() === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {att.status || 'Unknown'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No attendance records yet.</p>
                    <p className="text-sm">Your attendance will appear here once recorded by your teacher.</p>
                  </div>
                )}
              </div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">My Class Schedule</h3>
                    <p className="text-sm text-gray-600">
                      {profile.gradeLevel} - {profile.section}
                      {profile.adviserName && <span className="ml-2">| Adviser: <strong>{profile.adviserName}</strong></span>}
                    </p>
                  </div>
                </div>

                {data.schedule && data.schedule.length > 0 ? (
                  <div className="grid gap-4">
                    {/* Group by day */}
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                      const daySchedule = data.schedule.filter(s => s.day === day);
                      if (daySchedule.length === 0) return null;
                      
                      return (
                        <div key={day} className="border rounded-lg overflow-hidden">
                          <div className="bg-red-900 text-white px-4 py-2 font-semibold">{day}</div>
                          <div className="divide-y">
                            {daySchedule.map((item, i) => (
                              <div key={i} className="flex items-center px-4 py-3 hover:bg-gray-50">
                                <div className="w-24 text-sm text-gray-600 font-medium">
                                  {item.start_time} - {item.end_time}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{item.subject}</p>
                                  <p className="text-sm text-gray-500">{item.teacher_name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No schedule available yet.</p>
                    <p className="text-sm">Your class schedule will appear here once set by the administrator.</p>
                  </div>
                )}

                {data.previousScheduleHistory && data.previousScheduleHistory.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">Previous Schedule Before Promotion</h4>
                    <div className="space-y-4">
                      {data.previousScheduleHistory.map((record, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <p className="font-semibold text-gray-800">
                              {record.fromGrade || 'Previous Grade'}
                              {record.fromSection ? ` - ${record.fromSection}` : ''}
                              {' '}→ {record.toGrade || 'Next Grade'}
                              {record.toSection ? ` - ${record.toSection}` : ''}
                              {record.schoolYearLabel ? ` (${record.schoolYearLabel})` : ''}
                            </p>
                            {record.promotedAt && (
                              <p className="text-xs text-gray-500">
                                Saved on {new Date(record.promotedAt).toLocaleDateString('en-US')}
                              </p>
                            )}
                          </div>

                          {Array.isArray(record.schedule) && record.schedule.length > 0 ? (
                            <div className="grid gap-3">
                              {(() => {
                                const preferredOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                                const rawDays = [...new Set((record.schedule || []).map((s) => s.day || 'N/A'))];
                                const orderedDays = [
                                  ...preferredOrder.filter((day) => rawDays.includes(day)),
                                  ...rawDays.filter((day) => !preferredOrder.includes(day))
                                ];

                                return orderedDays.map(day => {
                                const daySchedule = record.schedule.filter(s => s.day === day);
                                if (daySchedule.length === 0) return null;
                                return (
                                  <div key={day} className="border rounded-md overflow-hidden bg-white">
                                    <div className="bg-gray-200 text-gray-700 px-3 py-1 text-sm font-semibold">{day}</div>
                                    <div className="divide-y">
                                      {daySchedule.map((item, i) => (
                                        <div key={i} className="flex items-center px-3 py-2 text-sm">
                                          <div className="w-32 text-gray-600">{item.start_time} - {item.end_time}</div>
                                          <div className="flex-1">
                                            <p className="font-semibold text-gray-800">{item.subject}</p>
                                            <p className="text-xs text-gray-500">{item.teacher_name}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                                });
                              })()}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No saved schedule snapshot for this promotion record.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Modal */}
      {showRankingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[85vh] overflow-auto">
            <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h1 className="text-lg font-semibold tracking-wide">Posted Ranking</h1>
              <button
                onClick={() => setShowRankingModal(false)}
                className="flex items-center gap-2 text-white font-semibold px-4 py-2 hover:bg-blue-800 transition rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {publishedRankings.length === 0 && publishedRankingLists.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                  <p className="text-lg font-semibold text-gray-700">No ranking posted yet</p>
                  <p className="text-sm mt-2">Your adviser/teacher has not posted ranking for your class yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {publishedRankings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">Individual Ranking Posts</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {publishedRankings.map((ranking, idx) => (
                          <div key={`${ranking.rankingType || 'ranking'}-${ranking.quarter || 'all'}-${ranking.subject || 'general'}-${idx}`} className="rounded-lg bg-white border border-blue-100 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-800">{ranking.title || 'Published Ranking'}</p>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getRankingBadgeClass(Number(ranking.rank))}`}>
                                Rank #{ranking.rank || '-'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">
                              Score: <strong>{formatRankingScore(ranking.score)}</strong>
                            </p>
                            <p className="text-sm text-gray-600">
                              Population: {ranking.totalStudents || 0} students
                            </p>
                            {ranking.publishedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Posted on {new Date(ranking.publishedAt).toLocaleString('en-US')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {publishedRankingLists.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Full Class Ranking Lists</h3>
                      {publishedRankingLists.map((rankingList, idx) => (
                        <div key={`${rankingList.rankingType || 'list'}-${rankingList.quarter || 'all'}-${rankingList.subject || 'general'}-${idx}`} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                            <p className="font-semibold text-gray-800">{rankingList.title || 'Full Class Ranking'}</p>
                            <div className="text-xs text-gray-600">
                              {rankingList.totalStudents || rankingList.entries?.length || 0} students
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-600 border-b border-emerald-200">
                                  <th className="py-2 pr-3">Rank</th>
                                  <th className="py-2 pr-3">Student</th>
                                  <th className="py-2 pr-3">Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(rankingList.entries || []).map((entry, entryIdx) => (
                                  <tr key={`${entry.studentId || entry.studentName}-${entryIdx}`} className={`${entry.isCurrentStudent ? 'bg-blue-100/60 font-semibold' : ''} border-b border-emerald-100`}>
                                    <td className="py-2 pr-3">#{entry.rank || '-'}</td>
                                    <td className="py-2 pr-3">{entry.studentName || 'Unknown Student'}{entry.isCurrentStudent ? ' (You)' : ''}</td>
                                    <td className="py-2 pr-3">{formatRankingScore(entry.score)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {rankingList.publishedAt && (
                            <p className="text-xs text-gray-500 mt-3">
                              Posted on {new Date(rankingList.publishedAt).toLocaleString('en-US')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Card Preview Modal */}
      {showReportCardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="bg-[#8f0303] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h1 className="text-lg font-semibold tracking-wide">
                Pupil's Progress Report Card and Report on Attendance
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReportCard}
                  className="flex items-center gap-2 text-[#ffffff] font-semibold px-4 py-2.5 hover:bg-red-800 transition"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={downloadReportCard}
                  className="flex items-center gap-2 text-[#ffffff] font-semibold px-4 py-2.5 hover:bg-red-800 transition"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowReportCardModal(false)}
                  className="flex items-center gap-2 text-[#ffffff] font-semibold px-4 py-2.5 hover:bg-red-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Report Card Content */}
            <div className="p-6">
              <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl border p-8 scale-95 origin-top transform"
                style={{
                  transform: "scale(0.90)",
                  transformOrigin: "top center",
                  padding: "2cm",
                  marginBottom: "-6cm",
                }}
              >
                {/* Header Section */}
                <div className="relative pb-4 mb-6 text-center">
                  <img
                    src="/wmsu-logo.jpg"
                    alt="WMSU Logo"
                    className="absolute left-12 top-4 w-25 h-25 object-contain"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0' stroke='%23333' stroke-width='2'/%3E%3Ctext x='50' y='40' text-anchor='middle' font-family='Arial' font-size='12' fill='%23333'%3EWMSU%3C/text%3E%3Ctext x='50' y='55' text-anchor='middle' font-family='Arial' font-size='10' fill='%23333'%3ELOGO%3C/text%3E%3C/svg%3E";
                    }}
                  />

                  <div>
                    <h2 className="text-xl font-bold">
                      WESTERN MINDANAO STATE UNIVERSITY
                    </h2>
                    <p className="text-sm leading-tight">
                      College of Teacher Education <br />
                      Integrated Laboratory School <br />
                      <span className="font-bold">ELEMENTARY DEPARTMENT</span> <br />
                      Zamboanga City
                    </p>
                    <h3 className="font-bold mt-2">PUPIL'S PROGRESS REPORT CARD</h3>
                    <div className="flex items-center justify-center">
                      <span className="text-sm mr-2">School Year {reportCardSchoolYearLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Student Information */}
                <div className="mb-6 text-sm space-y-2">
                  <div className="flex items-center">
                    <span className="font-semibold mr-2">Name:</span>
                    <span className="ml-2 underline decoration-gray-600">{profile.fullName}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center">
                      <span className="font-semibold mr-2">Age:</span>
                      <span className="ml-2 underline decoration-gray-600">{profile.age}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold mr-2">Sex:</span>
                      <span className="ml-2 underline decoration-gray-600">{profile.sex}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold mr-2">Grade:</span>
                      <span className="ml-2 underline decoration-gray-600">{profile.gradeLevel}</span>
                    </div>
                    <div className="flex items-center flex-1 min-w-[180px]">
                      <span className="font-semibold mr-2">Section:</span>
                      <span className="ml-2 underline decoration-gray-600">{profile.section}</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="font-semibold mr-2">LRN:</span>
                    <span className="ml-2 underline decoration-gray-600">{profile.lrn}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="font-semibold mr-2">Class Adviser:</span>
                    <span className="ml-2 underline decoration-gray-600">{reportCardAdviserName}</span>
                  </div>
                </div>

                {/* Message to Parents */}
                <div className="w-[98%] mx-auto -mt-5">
                  <p className="text-sm mb-4 text-justify leading-relaxed">
                    <span>Dear Parents,</span>
                    <span className="block indent-4">
                      This report card shows the ability and progress of your child has made in the different
                      learning areas as well as his/her core values.
                    </span>
                    <span className="block indent-4">
                      The school welcomes you should you desire to know more about your child's progress.
                    </span>
                  </p>
                </div>

                {/* Learning Progress Header */}
                <h4 className="font-bold text-center -mt-2 mb-1">
                  REPORT ON LEARNING PROGRESS AND ACHIEVEMENT
                </h4>

                {/* Grades Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 text-sm text-center">
                    <thead className="bg-gray-100">
                      <tr>
                        <th rowSpan="2" className="border border-gray-300 px-2 py-1">Learning Areas</th>
                        <th colSpan="4" className="border border-gray-300 px-2 py-1">Quarter</th>
                        <th rowSpan="2" className="border border-gray-300 px-2 py-1">Final Grade</th>
                        <th rowSpan="2" className="border border-gray-300 px-2 py-1">Remarks</th>
                      </tr>
                      <tr>
                        <th className="border border-gray-300 px-2 py-1">1</th>
                        <th className="border border-gray-300 px-2 py-1">2</th>
                        <th className="border border-gray-300 px-2 py-1">3</th>
                        <th className="border border-gray-300 px-2 py-1">4</th>
                      </tr>
                    </thead>

                    <tbody>
                      {grades.length > 0 ? (
                        grades.map((g, i) => (
                          <tr key={i}>
                            <td className="border border-gray-300 px-2 py-1 text-left">{formatReportCardSubject(g.subject)}</td>
                            <td className="border border-gray-300 px-2 py-1">{g.q1 || ''}</td>
                            <td className="border border-gray-300 px-2 py-1">{g.q2 || ''}</td>
                            <td className="border border-gray-300 px-2 py-1">{g.q3 || ''}</td>
                            <td className="border border-gray-300 px-2 py-1">{g.q4 || ''}</td>
                            <td className="border border-gray-300 px-2 py-1 font-semibold">{g.average || ''}</td>
                            <td className="border border-gray-300 px-2 py-1">{g.remarks || ''}</td>
                          </tr>
                        ))
                      ) : (
                        Array.from({ length: 10 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="border border-gray-300 px-2 py-3">&nbsp;</td>
                            ))}
                          </tr>
                        ))
                      )}

                      <tr className="bg-gray-100 font-semibold">
                        <td className="border border-gray-300 px-2 py-1"></td>
                        <td colSpan="4" className="border border-gray-300 px-2 py-1 text-center">General Average</td>
                        <td className="border border-gray-300 px-2 py-1">
                          {grades.length > 0 ? computeGeneralAverage() : ""}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">{grades.length > 0 ? "Passed" : ""}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Remedial Classes Section */}
                <div className="mt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300 text-sm text-center">
                      <thead className="bg-gray-100">
                        <tr>
                          <th colSpan="1" className="border border-gray-300 px-2 py-1 text-center">
                            <span className="font-semibold">Remedial Classes</span>
                          </th>
                          <th colSpan="4" className="border border-gray-300 px-2 py-1 text-center">
                            <div className="flex justify-start items-center">
                              <span>Conducted from:</span>
                              <span className="ml-65">to:</span>
                            </div>
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-gray-300 px-2 py-1">Learning Areas</th>
                          <th className="border border-gray-300 px-2 py-1">Final Rating</th>
                          <th className="border border-gray-300 px-2 py-1">Remedial Class Mark</th>
                          <th className="border border-gray-300 px-2 py-1">Recomputed Final Grade</th>
                          <th className="border border-gray-300 px-2 py-1">Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="border border-gray-300 px-2 py-3">&nbsp;</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-12 flex justify-center gap-80 text-center text-sm">
                  <div>
                    <p className="font-bold underline">{reportCardPrincipalName}</p>
                    <p>Principal</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{reportCardAssistantPrincipalName}</p>
                    <p>Assistant Principal</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{reportCardAdviserName}</p>
                    <p>Class Adviser</p>
                  </div>
                </div>

                <hr className="border-gray-900 mt-15 mb-2" /> 

                {/* Attendance Section */}
                <h2 className="text-xl font-bold text-center mt-12 mb-6">REPORT ON ATTENDANCE</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 text-sm text-center mb-8">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-2 py-1"></th>
                        {months.map((month, i) => (
                          <th key={i} className="border border-gray-300 px-2 py-1">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 text-left">No. of school days</td>
                        {months.map((_, i) => (
                          <td key={i} className="border border-gray-300 px-2 py-1"></td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 text-left">No. of days present</td>
                        {months.map((_, i) => (
                          <td key={i} className="border border-gray-300 px-2 py-1"></td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 text-left">No. of days absent</td>
                        {months.map((_, i) => (
                          <td key={i} className="border border-gray-300 px-2 py-1"></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Parent Signatures */}
                <div className="mt-10 mb-15 text-center justify-center">
                  <h3 className="font-bold text-center mb-4">PARENT / GUARDIAN'S SIGNATURE</h3>
                  <div className="space-y-3 text-sm text-center justify-center">
                    <p>1<sup>st</sup> Quarter ____________________________________________</p>
                    <p>2<sup>nd</sup> Quarter ____________________________________________</p>
                    <p>3<sup>rd</sup> Quarter ____________________________________________</p>
                    <p>4<sup>th</sup> Quarter ____________________________________________</p>
                  </div>
                </div>

                {/* Certificate of Transfer */}
                <div className="mb-10">
                  <h3 className="font-bold text-center mt-7 mb-4">Certificate of Transfer</h3>
                  <div className="text-sm space-y-2">
                    <p>Admitted in Grade ___________________________ Section ___________________</p>
                    <p>Eligible to Admission in Grade __________________________________________</p>
                    <p>Approved:</p>
                    <div className="mt-8 flex justify-center gap-100 text-center text-sm">
                      <div>
                        <p className="font-semibold underline">{reportCardPrincipalName}</p>
                        <p>Principal</p>
                      </div>
                      <div>
                        <p className="font-semibold underline">______________________</p>
                        <p>Class Adviser</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cancellation Section */}
                <div className="text-sm">
                  <h3 className="font-bold text-center mb-4">
                    Cancellation of Eligibility to Transfer
                  </h3>

                  <p>Admitted in: ___________________________</p>

                  <div className="flex justify-between items-end mt-2">
                    <p>Date: ___________________________</p>

                    <div className="text-center">
                      <p className="font-semibold underline leading-tight">
                        {reportCardPrincipalName}
                      </p>
                      <p className="leading-tight">Principal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentPortal;