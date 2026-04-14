import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import html2canvas from "html2canvas";
import axios from "../../api/axiosConfig";
import { toast } from 'react-toastify';
import {
  QrCodeIcon,
  CameraIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,    
  IdentificationIcon,  
  UserCircleIcon,   
  CalendarIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  PrinterIcon as PrinterIconSolid,
  ChartBarSquareIcon,
} from "@heroicons/react/24/solid";
import {
  appendSchoolYearId,
  dedupeTeacherClasses,
  getTeacherActiveSchoolYearId,
  getTeacherViewingSchoolYearId,
  isTeacherViewOnlyMode,
  setTeacherActiveSchoolYearId,
  setTeacherViewingSchoolYearId,
} from "../../utils/teacherSchoolYear";

export default function QRCodePortal() {
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef(null);
  const idCardRef = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("All Status");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSection, setSelectedSection] = useState("All Sections");
  const [openSection, setOpenSection] = useState(false);
  const [sections, setSections] = useState(["All Sections"]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]); // Store all attendance records
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState(() => getTeacherActiveSchoolYearId());
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(() => getTeacherViewingSchoolYearId());
  const isViewOnlyMode = isTeacherViewOnlyMode(selectedSchoolYearId, activeSchoolYearId);
  const [attendanceStats, setAttendanceStats] = useState({
    todayScans: 0,
    presentStudents: 0,
    lateStudents: 0,
    absentStudents: 0
  });
  const options = ["All Status", "Present", "Late", "Absent", "Not Scanned"];

  const getRecordDateTime = (record = {}) => {
    const ts = record.timestamp ? new Date(record.timestamp) : null;
    if (ts && !Number.isNaN(ts.getTime())) return ts;

    const dateRaw = String(record.date || '').trim();
    const datePart = dateRaw.includes('T') ? dateRaw.split('T')[0] : dateRaw.split(' ')[0];
    const timePart = String(record.time || '00:00:00').slice(0, 8) || '00:00:00';
    const combined = datePart ? new Date(`${datePart}T${timePart}`) : new Date(dateRaw);
    return Number.isNaN(combined.getTime()) ? null : combined;
  };

  const formatTimeAgo = (dateValue) => {
    if (!dateValue) return 'Just now';
    const diffMs = Date.now() - dateValue.getTime();
    if (diffMs <= 0) return 'Just now';

    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatSyncTime = (dateValue) => {
    if (!dateValue) return 'Not synced yet';
    return dateValue.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  useEffect(() => {
    const fetchActiveSchoolYear = async () => {
      try {
        const res = await axios.get('/school-years/active');
        const activeSy = res.data?.data || res.data;
        if (activeSy?.id) {
          const nextActiveId = String(activeSy.id);
          setActiveSchoolYearId(nextActiveId);
          setTeacherActiveSchoolYearId(nextActiveId);
          // Keep teacher web pages aligned to active SY so mobile/web attendance stay connected.
          setSelectedSchoolYearId(nextActiveId);
          setTeacherViewingSchoolYearId(nextActiveId);
        }
      } catch (error) {
        console.warn('Could not load active school year:', error.message);
      }
    };

    fetchActiveSchoolYear();
  }, []);

  useEffect(() => {
    if (selectedSchoolYearId) {
      setTeacherViewingSchoolYearId(selectedSchoolYearId);
    }
  }, [selectedSchoolYearId]);

  useEffect(() => {
    loadStudents();
    loadAttendanceForDate(selectedDate);
  }, [selectedSchoolYearId]);

  // Reload attendance when date changes
  useEffect(() => {
    loadAttendanceForDate(selectedDate);
  }, [selectedDate, selectedSchoolYearId]);

  // Load attendance records for a specific date
  const loadAttendanceForDate = async (date) => {
    try {
      console.log('Loading attendance for date:', date);
      const attendanceResponse = await axios.get('/attendance', {
        params: {
          date,
          ...(selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {})
        }
      });
      console.log('Attendance API response:', attendanceResponse.data);
      
      const allAttendance = Array.isArray(attendanceResponse.data.data) 
        ? attendanceResponse.data.data 
        : Array.isArray(attendanceResponse.data) 
        ? attendanceResponse.data 
        : [];

      const normalizeDate = (value) => {
        if (!value) return '';
        const raw = String(value);
        if (raw.includes('T')) return raw.split('T')[0];
        if (raw.includes(' ')) return raw.split(' ')[0];
        return raw;
      };
      
      console.log('All attendance records:', allAttendance.length);
      
      // Filter by selected date
      const dateAttendance = allAttendance.filter(record => normalizeDate(record.date) === String(date));
      console.log(`Attendance records for ${date}:`, dateAttendance.length, dateAttendance);
      setAttendanceRecords(dateAttendance);
      setLastSyncAt(new Date());
      
      // Calculate statistics
      const presentCount = dateAttendance.filter(r => r.status?.toLowerCase() === 'present').length;
      const lateCount = dateAttendance.filter(r => r.status?.toLowerCase() === 'late').length;
      const absentCount = dateAttendance.filter(r => r.status?.toLowerCase() === 'absent').length;
      
      setAttendanceStats({
        todayScans: dateAttendance.length,
        presentStudents: presentCount,
        lateStudents: lateCount,
        absentStudents: absentCount
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  // Get students with their attendance status for the selected date
  const getStudentsWithAttendance = () => {
    console.log('Getting students with attendance. Students:', students.length, 'Records:', attendanceRecords.length);
    
    return students.map(student => {
      const candidateIds = new Set(
        [student.id, student.lrn, student.studentId]
          .filter(Boolean)
          .map(v => String(v))
      );
      // Find attendance record for this student on selected date
      // Match by UUID, LRN, or studentId
      const record = attendanceRecords.find(r => {
        const recordId = String(r.studentId || '');
        const studentIdMatch = candidateIds.has(recordId);
        const lrnMatch = false;
        const customIdMatch = false;
        const nameLrnMatch = false;
        
        return studentIdMatch || lrnMatch || customIdMatch || nameLrnMatch;
      });
      
      if (record) {
        console.log(`Found attendance for ${student.fullName}: ${record.status}`);
      }
      
      return {
        ...student,
        currentAttendance: record ? record.status : 'Not Scanned',
        lastScanned: record ? (record.time || record.timestamp?.substring(11, 19)) : null,
        attendanceRecord: record
      };
    });
  };

  // Apply filters (status, section, and search)
  const getFilteredStudents = () => {
    let filtered = getStudentsWithAttendance();
    
    // Filter by section
    if (selectedSection !== "All Sections") {
      filtered = filtered.filter(student => student.section === selectedSection);
    }
    
    // Filter by status
    if (selected !== "All Status") {
      filtered = filtered.filter(student => {
        const status = student.currentAttendance?.toLowerCase() || 'not scanned';
        return status === selected.toLowerCase();
      });
    }
    
    return filtered;
  };
  const filteredStudents = getFilteredStudents();
  const attendanceRate = students.length > 0
    ? Math.round(((attendanceStats.presentStudents + attendanceStats.lateStudents) / students.length) * 1000) / 10
    : 0;
  const recentActivity = [...attendanceRecords]
    .map((record) => ({ ...record, _dt: getRecordDateTime(record) }))
    .sort((a, b) => (b._dt?.getTime() || 0) - (a._dt?.getTime() || 0))
    .slice(0, 5);

  const loadStudents = async () => {
    try {
      setLoading(true);
      
      // Get current user from localStorage
      const userStr = localStorage.getItem("user");
      let currentUser = null;
      if (userStr) {
        currentUser = JSON.parse(userStr);
      }

      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      // Fetch classes assigned to this teacher (adviser + subject teacher)
      let assignedClasses = [];
      try {
        const [adviserRes, stRes] = await Promise.all([
          axios.get(appendSchoolYearId(`/classes/adviser/${currentUser.id}`, selectedSchoolYearId)),
          axios.get(appendSchoolYearId(`/classes/subject-teacher/${currentUser.id}`, selectedSchoolYearId))
        ]);
        let adviserClasses = Array.isArray(adviserRes.data.data) ? adviserRes.data.data : [];
        const stClasses = Array.isArray(stRes.data.data) ? stRes.data.data : [];
        // Fallback: if no adviser classes by ID, search by adviser_name (partial match for middle names)
        if (adviserClasses.length === 0 && currentUser.firstName && currentUser.lastName) {
          try {
            const allRes = await axios.get(appendSchoolYearId('/classes', selectedSchoolYearId));
            const allClasses = Array.isArray(allRes.data)
              ? allRes.data
              : (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
            adviserClasses = allClasses.filter(c =>
              c.adviser_name &&
              c.adviser_name.includes(currentUser.firstName) &&
              c.adviser_name.includes(currentUser.lastName)
            );
          } catch (fbErr) { /* non-critical */ }
        }
        const combined = [...adviserClasses, ...stClasses];
        assignedClasses = dedupeTeacherClasses(combined);
      } catch (e) {
        console.error('Error fetching assigned classes:', e);
      }
      
      // Fetch all students
      const response = await axios.get('/students', {
        params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}
      });
      let studentData = Array.isArray(response.data.data) ? response.data.data : 
                       Array.isArray(response.data) ? response.data : [];
      
      console.log('Total students fetched:', studentData.length);

      // Filter students to only those in teacher's assigned classes
      if (assignedClasses.length > 0) {
        const normalize = str => (str || '').toString().trim().toLowerCase();
        studentData = studentData.filter(student =>
          assignedClasses.some(c =>
            normalize(c.grade) === normalize(student.gradeLevel) &&
            normalize(c.section) === normalize(student.section)
          )
        );
        console.log('Filtered to assigned classes:', studentData.length, 'students from', assignedClasses.map(c => `${c.grade}-${c.section}`).join(', '));
      }
      
      console.log('Filtered students count:', studentData.length);
      setStudents(studentData);
      
      // Extract unique sections from students
      const uniqueSections = [...new Set(studentData.map(s => s.section).filter(Boolean))];
      setSections(["All Sections", ...uniqueSections.sort()]);
      
      // Fetch real attendance data for today
      try {
        const attendanceResponse = await axios.get('/attendance', {
          params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}
        });
        const allAttendance = Array.isArray(attendanceResponse.data.data) 
          ? attendanceResponse.data.data 
          : Array.isArray(attendanceResponse.data) 
          ? attendanceResponse.data 
          : [];
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        const normalizeDate = (value) => {
          if (!value) return '';
          const raw = String(value);
          if (raw.includes('T')) return raw.split('T')[0];
          if (raw.includes(' ')) return raw.split(' ')[0];
          return raw;
        };
        
        // Filter today's attendance records
        const todayAttendance = allAttendance.filter(record => normalizeDate(record.date) === today);
        
        console.log('Today\'s attendance records:', todayAttendance.length);
        
        // Update student data with attendance info
        const studentsWithAttendance = studentData.map(student => {
          const candidateIds = new Set(
            [student.id, student.lrn, student.studentId]
              .filter(Boolean)
              .map(v => String(v))
          );
          const attendanceRecord = todayAttendance.find(r => candidateIds.has(String(r.studentId || '')));
          return {
            ...student,
            attendance: attendanceRecord ? attendanceRecord.status : 'Not Scanned',
            lastScanned: attendanceRecord ? attendanceRecord.timestamp.substring(11, 16) : null
          };
        });
        
        setStudents(studentsWithAttendance);
        
        // Calculate real attendance statistics
        const presentCount = todayAttendance.filter(r => r.status === 'Present').length;
        const lateCount = todayAttendance.filter(r => r.status === 'Late').length;
        const absentCount = todayAttendance.filter(r => r.status === 'Absent').length;
        
        const stats = {
          todayScans: todayAttendance.length, // Real count
          presentStudents: presentCount,
          lateStudents: lateCount,
          absentStudents: absentCount
        };
        
        console.log('Attendance stats:', stats);
        setAttendanceStats(stats);
        
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        // Fall back to showing only student count
        const stats = {
          todayScans: 0,
          presentStudents: 0,
          lateStudents: 0,
          absentStudents: 0
        };
        setAttendanceStats(stats);
      }
      
      // Set the first student as default if available
      if (studentData.length > 0) {
        setSelectedStudent(studentData[0]);
      }
      
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
      setAttendanceStats({
        todayScans: 0,
        presentStudents: 0,
        lateStudents: 0,
        absentStudents: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle QR code scanning and attendance recording
  const handleBarCodeScanned = async (qrText) => {
    try {
      if (isViewOnlyMode) {
        toast.error('Past school years are view-only. QR attendance scanning is disabled.');
        return;
      }

      let qrData = null;
      let studentId = null;
      
      // Try to parse as JSON first
      try {
        qrData = JSON.parse(qrText);
        studentId = qrData.studentId || qrData.id;
      } catch {
        // If not JSON, treat the entire string as studentId
        studentId = qrText;
      }

      if (!studentId) {
        toast.error('Invalid QR code: No student ID found');
        return;
      }

      // Find the student in the loaded list
      const scannedStudent = students.find(s => 
        s.id === studentId || 
        s.studentId === studentId ||
        s.lrn === studentId
      );

      if (!scannedStudent) {
        toast.error('Student not found in system');
        return;
      }

      // Determine attendance status based on time
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      let status = 'Absent';
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      const totalMinutes = (hour * 60) + minute;

      // Morning session (Before 8:30 AM = Present, 8:30-9:59 AM = Late, After 10:00 AM = Absent)
      if (totalMinutes < (8 * 60 + 30)) {
        status = 'Present';
      } else if (totalMinutes < (10 * 60)) {
        status = 'Late';
      } else if (totalMinutes < (12 * 60)) {
        status = 'Absent';
      }
      // Afternoon session (Before 2:30 PM = Present, 2:30-2:59 PM = Late, After 3:00 PM = Absent)
      else if (totalMinutes < (14 * 60 + 30)) {
        status = 'Present';
      } else if (totalMinutes < (15 * 60)) {
        status = 'Late';
      } else {
        status = 'Absent';
      }

      // Determine period based on time
      const period = hour < 12 ? 'morning' : 'afternoon';
      
      // Get current user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const teacherId = currentUser.id || currentUser.username || null;
      const teacherName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}` 
        : currentUser.name || 'QR Portal';

      // Record attendance to backend
      try {
        const response = await axios.post('/attendance', {
          studentId: scannedStudent.id,
          name: scannedStudent.fullName,
          gradeLevel: scannedStudent.gradeLevel,
          section: scannedStudent.section,
          status: status,
          date: selectedDate,
          time: timeStr,
          timestamp: now.toISOString(),
          period: period,
          teacherId: teacherId,
          teacherName: teacherName,
          qrData: qrData,
          location: 'QR Portal - Web',
          ...(selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            source: 'web-qr-portal'
          }
        });

        if (response.data.success) {
          // Reload attendance data from database
          await loadAttendanceForDate(selectedDate);

          toast.success(`✓ ${scannedStudent.fullName} - Status: ${status} - Time: ${timeStr} - Recorded in database!`);
        } else {
          toast.error(`Failed: ${response.data.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error recording attendance:', error);
        toast.error(`Error: ${error.response?.data?.message || error.message}`);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error('Invalid QR code format');
    }
  };

  const buildPrintableCard = (student) => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "700px";
    container.style.background = "#ffffff";
    container.style.border = "1px solid #e5e7eb";
    container.style.borderRadius = "24px";
    container.style.overflow = "hidden";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.fontFamily = "'Inter', 'Segoe UI', sans-serif";

    container.innerHTML = `
      <div style="background: linear-gradient(90deg, #7f1d1d, #991b1b); color: #fff; text-align: center; padding: 28px 12px;">
        <div style="font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">WMSU-ILS - Elementary Department</div>
        <div style="font-size: 17px; opacity: 0.9; margin-top: 6px;">Integrated Learning System</div>
      </div>
      <div style="flex:1; padding: 48px; display:flex; flex-direction:column; gap:28px; background:#fff;">
        <div style="display:flex; gap:32px; align-items:center;">
          <div style="width:120px; height:120px; border-radius:28px; background: linear-gradient(135deg, #dbeafe, #bfdbfe); display:flex; align-items:center; justify-content:center; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="#1d4ed8" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4Z"/>
            </svg>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:22px; font-weight:800; color:#111827;">${student.lastName || ''}, ${student.firstName || ''}</div>
            <div style="font-size:16px; color:#1f2937;">LRN: <span style="font-family:'Montserrat','Segoe UI',sans-serif; font-size:18px;">${student.lrn || 'N/A'}</span></div>
            <div style="font-size:16px; font-weight:700; color:#7f1d1d;">${student.gradeLevel || 'N/A'} - ${student.section || 'N/A'}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:center;">
          <div style="width:240px; height:240px; margin-top:0; background:#f3f4f6; border:4px dashed #9ca3af; border-radius:18px; display:flex; align-items:center; justify-content:center; box-shadow: 0 12px 30px rgba(0,0,0,0.12); overflow:hidden;">
            <img src="${student.qrCode}" alt="QR Code" style="width:100%; height:100%; object-fit:cover;" crossorigin="anonymous" />
          </div>
        </div>
      </div>
    `;

    return container;
  };

  const captureIdCard = async () => {
    if (!selectedStudent) {
      toast.error("Select a student first.");
      return null;
    }

    if (!selectedStudent.qrCode) {
      toast.error("No QR code available for this student.");
      return null;
    }

    let iframe = null;
    try {
      // Render in an isolated iframe to avoid page styles (oklch) tainting the capture
      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-2000px";
      iframe.style.top = "-2000px";
      iframe.style.width = "900px";
      iframe.style.height = "900px";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      doc.open();
      doc.write(`<!doctype html><html><head></head><body style="margin:0;padding:0;background:#ffffff;font-family:'Inter','Segoe UI',sans-serif;"></body></html>`);
      doc.close();

      const tempCard = buildPrintableCard(selectedStudent);
      doc.body.appendChild(tempCard);

      // Give the iframe a tick to layout
      await new Promise((resolve) => setTimeout(resolve, 50));

      const canvas = await html2canvas(tempCard, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 900,
        windowHeight: 900,
      });

      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Failed to capture ID:", error);
      toast.error(`Failed to capture ID. ${error?.message || "Please try again."}`);
      return null;
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  };

  const handleDownloadId = async () => {
    const dataUrl = await captureIdCard();
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `ID_${selectedStudent.lrn || selectedStudent.id || "student"}.png`;
    link.click();
  };

  const handlePrintId = async () => {
    const dataUrl = await captureIdCard();
    if (!dataUrl) return;

    try {
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        toast.error("Please allow popups to print the ID.");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Print ID</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
              img { width: 800px; height: auto; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Failed to print ID:", error);
      toast.error(`Failed to print ID. ${error?.message || "Please try again."}`);
    }
  };

  const handlePrintAttendanceLog = () => {
    window.print();
  };

  useEffect(() => {
    if (!scannerActive || !videoRef.current) return;

    const codeReader = new BrowserMultiFormatReader();
    const decodeHandler = (result) => {
      if (result) {
        console.log("QR Scanned:", result.text);
        handleBarCodeScanned(result.text);
      }
    };

    codeReader.decodeFromVideoDevice(null, videoRef.current, decodeHandler);

    return () => codeReader.reset();
  }, [scannerActive, students, attendanceStats]);

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 flex items-center justify-between print:hidden">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <QrCodeIcon className="w-10 h-10 text-red-800" />
            QR Code Portal
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{attendanceStats.todayScans}</p>
                <p className="text-sm opacity-90 mt-1">Today's Scans</p>
                <p className="text-xs opacity-80">Total check-ins today</p>
              </div>
              <QrCodeIcon className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{attendanceStats.presentStudents}</p>
                <p className="text-sm opacity-90 mt-1">Present</p>
                <p className="text-xs opacity-80">{students.length > 0 ? Math.round((attendanceStats.presentStudents / students.length) * 100) : 0}% attendance</p>
              </div>
              <ClockIcon className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{attendanceStats.lateStudents}</p>
                <p className="text-sm opacity-90 mt-1">Late</p>
                <p className="text-xs opacity-80">Students arrived late</p>
              </div>
              <ExclamationTriangleIcon className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-pink-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{attendanceStats.absentStudents}</p>
                <p className="text-sm opacity-90 mt-1">Absent</p>
                <p className="text-xs opacity-80">Notifications sent</p>
              </div>
              <UsersIcon className="w-12 h-12 opacity-80" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-8 border-b border-gray-300 pb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-3 transition-all ${
              activeTab === "overview"
                ? "bg-red-700 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ChartBarSquareIcon className="w-8 h-8" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("scanner")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-3 transition-all ${
              activeTab === "scanner"
                ? "bg-red-700 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <QrCodeIcon className="w-8 h-8" />
            Scan QR Code
          </button>

          <button
            onClick={() => setActiveTab("idcards")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-3 transition-all ${
              activeTab === "idcards"
                ? "bg-red-700 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <IdentificationIcon className="w-8 h-8" />
            Generate ID Cards
          </button>

          <button
            onClick={() => setActiveTab("log")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-3 transition-all ${
              activeTab === "log"
                ? "bg-red-700 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UsersIcon className="w-8 h-8" />
            Attendance Log
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Overview Section Header */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4">
              <h3 className="text-2xl font-bold text-gray-900">System Overview</h3>
              <p className="text-gray-600 mt-2">Complete attendance and student management overview</p>
            </div>

            {/* Additional Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm text-gray-500 uppercase tracking-wide">Total Students</h4>
                    <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                    <p className="text-sm text-green-600 mt-1">All registered</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <UsersIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm text-gray-500 uppercase tracking-wide">Attendance Rate</h4>
                    <p className="text-3xl font-bold text-gray-900">{attendanceRate}%</p>
                    <p className="text-sm text-green-600 mt-1">For selected date scans</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <ClockIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm text-gray-500 uppercase tracking-wide">QR Scans Today</h4>
                    <p className="text-3xl font-bold text-gray-900">{attendanceStats.todayScans}</p>
                    <p className="text-sm text-blue-600 mt-1">Check-ins recorded</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <QrCodeIcon className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h4 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("scanner")}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <QrCodeIcon className="w-6 h-6" />
                  Scan QR Code
                </button>
                <button
                  onClick={() => setActiveTab("idcards")}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <IdentificationIcon className="w-6 h-6" />
                  Generate ID Cards
                </button>
                <button
                  onClick={() => setActiveTab("log")}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <UsersIcon className="w-6 h-6" />
                  View Attendance Log
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h4 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h4>
              <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map((activity, idx) => {
                  const status = String(activity.status || '').toLowerCase();
                  const when = activity._dt;
                  const title = status === 'late'
                    ? 'Late arrival noted'
                    : status === 'absent'
                    ? 'Student marked absent'
                    : 'Student check-in recorded';

                  const tone = status === 'late'
                    ? {
                        row: 'bg-orange-50 border-orange-200',
                        chip: 'text-orange-600 bg-orange-100',
                        iconWrap: 'bg-orange-100',
                        iconColor: 'text-orange-600',
                      }
                    : status === 'absent'
                    ? {
                        row: 'bg-red-50 border-red-200',
                        chip: 'text-red-600 bg-red-100',
                        iconWrap: 'bg-red-100',
                        iconColor: 'text-red-600',
                      }
                    : {
                        row: 'bg-green-50 border-green-200',
                        chip: 'text-green-600 bg-green-100',
                        iconWrap: 'bg-green-100',
                        iconColor: 'text-green-600',
                      };

                  return (
                    <div key={`${activity.id || activity.studentId || idx}-${idx}`} className={`flex items-center gap-4 p-4 rounded-lg border ${tone.row}`}>
                      <div className={`p-2 rounded-lg ${tone.iconWrap}`}>
                        {status === 'late' || status === 'absent' ? (
                          <ExclamationTriangleIcon className={`w-6 h-6 ${tone.iconColor}`} />
                        ) : (
                          <QrCodeIcon className={`w-6 h-6 ${tone.iconColor}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{title}</p>
                        <p className="text-sm text-gray-600">{activity.studentName || activity.name || 'Unknown Student'} - {activity.time || (when ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--')}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${tone.chip}`}>{formatTimeAgo(when)}</span>
                    </div>
                  );
                }) : (
                  <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    No attendance activity yet for this date.
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h5 className="text-lg font-bold text-gray-900 mb-4">System Status</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">QR Scanner</span>
                    <span className="flex items-center gap-2 text-green-600">
                      <div className={`w-2 h-2 rounded-full ${scannerActive ? 'bg-green-600' : 'bg-gray-400'}`}></div>
                      {scannerActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Database</span>
                    <span className="flex items-center gap-2 text-green-600">
                      <div className={`w-2 h-2 rounded-full ${lastSyncAt ? 'bg-green-600' : 'bg-gray-400'}`}></div>
                      {lastSyncAt ? 'Connected' : 'Waiting sync'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Sync</span>
                    <span className="text-gray-500">{formatSyncTime(lastSyncAt)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h5 className="text-lg font-bold text-gray-900 mb-4">Today's Summary</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Check-ins</span>
                    <span className="font-semibold text-gray-900">{attendanceStats.todayScans}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">On Time</span>
                    <span className="font-semibold text-green-600">{attendanceStats.presentStudents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Late Arrivals</span>
                    <span className="font-semibold text-orange-600">{attendanceStats.lateStudents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Absent</span>
                    <span className="font-semibold text-red-600">{attendanceStats.absentStudents}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "scanner" && (
          <div className="space-y-12">
            <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-200 max-w-xl mx-auto">
              <div className="bg-gray-800 rounded-3xl w-full h-[450px] relative overflow-hidden">
                {scannerActive ? (
                  <video ref={videoRef} className="w-3xl object-cover rounded-3xl" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="bg-gray-700 border-4 border-dashed border-gray-600 rounded-3xl w-48 h-48 mx-auto flex items-center justify-center mb-6">
                        <CameraIcon className="w-20 h-20 text-gray-500" />
                      </div>
                      <p className="text-gray-400 text-lg">Camera view will appear here</p>
                      <p className="text-gray-500 text-sm mt-2">Position the QR code within the frame</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-6 mt-10">
                <button
                  onClick={() => setScannerActive(!scannerActive)}
                  className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-sm flex items-center gap-4 shadow-lg transition"
                >
                  <CameraIcon className="w-5 h-5" />
                  {scannerActive ? "Stop Camera" : "Start Camera"}
                </button>
                <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm flex items-center gap-4 shadow-md transition">
                  <CloudArrowUpIcon className="w-5 h-5" />
                  Upload QR Code
                </button>
              </div>
            </div>

            <div className="bg-gray-100 rounded-2xl p-8 max-w-xl mx-auto">
              <h3 className="font-bold text-gray-800 mb-4">How to scan:</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-red-700 font-bold">•</span>
                  Position the student's ID card within the scanning frame
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-700 font-bold">•</span>
                  Hold steady until the QR code is detected
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-700 font-bold">•</span>
                  Attendance will be automatically recorded
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "idcards" && (
          <div className="max-w-3xl mx-auto space-y-10">

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 relative">
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const student = students.find(s => s.id === e.target.value);
                    setSelectedStudent(student);
                  }}
                  className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 transition"
                >
                  <option value="">Select a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.lastName}, {student.firstName} - {student.gradeLevel} {student.section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div ref={idCardRef} className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 w-[800px] h-[700px]">
              <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-10 py-8 text-center">
                <h3 className="text-2xl font-bold tracking-wide">WMSU-ILS - Elementary Department</h3>
                <p className="text-lg opacity-90 mt-1">Integrated Learning System</p>
              </div>

              <div className="p-12 bg-white">
                <div className="flex items-center gap-12 mb-16 ml-5">
                <div className="shrink-0">
                  <div className="w-30 h-30 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border-4 border-white">
                    <UserCircleIcon className="w-25 h-25 text-blue-600" />
                  </div>
                </div>

                <div className="flex-1 space-y-3 -ml-5">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {selectedStudent ? `${selectedStudent.lastName || ''}, ${selectedStudent.firstName || ''}`.trim() : 'No Student Selected'}
                    </h2>
                    <p className="text-base text-gray-700 font-medium -mt-2">
                      LRN: <span className="font-montserrat text-lg">{selectedStudent?.lrn || 'N/A'}</span>
                    </p>
                    <p className="text-base font-semibold text-red-800 -mt-2">
                      {selectedStudent?.gradeLevel || 'N/A'} - {selectedStudent?.section || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-60 h-60 -mt-10 bg-gray-100 border-4 border-dashed border-gray-400 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
                    {selectedStudent?.qrCode ? (
                      <img 
                        src={selectedStudent.qrCode}
                        crossOrigin="anonymous"
                        alt={`QR Code for ${selectedStudent.firstName} ${selectedStudent.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : selectedStudent ? (
                      <div className="text-center text-gray-600">
                        <QrCodeIcon className="w-20 h-20 mx-auto mb-2" />
                        <p className="text-sm">QR Code not generated</p>
                        <p className="text-xs">Generate one in mobile app</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <QrCodeIcon className="w-20 h-20 mx-auto mb-2" />
                        <p className="text-sm">Select a student first</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-8 mt-10">
                  <button
                    onClick={handleDownloadId}
                    className="px-8 py-4 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-base flex items-center gap-4 shadow-xl transition transform hover:scale-105"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download ID
                  </button>
                  <button
                    onClick={handlePrintId}
                    className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-base flex items-center gap-4 shadow-lg transition transform hover:scale-105"
                  >
                    <PrinterIcon className="w-5 h-5" />
                    Print ID
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl shadow-lg p-8 border">
              <div className="grid grid-row-1 md:grid-row-3 gap-6">

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                    <CalendarIcon className="w-6 h-6 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div className="relative w-240">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>

                  <button
                    type="button"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-4 pr-12 py-4 text-left flex justify-between items-center focus:outline-none focus:ring-1 cursor-pointer"
                    onClick={() => setOpen(!open)}
                  >
                    {selected}
                    <ChevronDownIcon
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 -mr-8 ${
                        open ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  {open && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg">
                      {options.map((option) => (
                        <li
                          key={option}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelected(option);
                            setOpen(false);
                          }}
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Section Filter */}
                <div className="relative w-240">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section
                  </label>

                  <button
                    type="button"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-4 pr-12 py-4 text-left flex justify-between items-center focus:outline-none focus:ring-1 cursor-pointer"
                    onClick={() => setOpenSection(!openSection)}
                  >
                    {selectedSection}
                    <ChevronDownIcon
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 -mr-8 ${
                        openSection ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  {openSection && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg">
                      {sections.map((section) => (
                        <li
                          key={section}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelectedSection(section);
                            setOpenSection(false);
                          }}
                        >
                          {section}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search student..."
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-red-800 text-white text-left">
                      <th className="px-6 py-5 font-bold">STUDENT ID</th>
                      <th className="px-6 py-5 font-bold">NAME</th>
                      <th className="px-6 py-5 font-bold">SECTION</th>
                      <th className="px-6 py-5 font-bold">TIME</th>
                      <th className="px-6 py-5 font-bold">STATUS</th>
                      <th className="px-6 py-5 font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents && filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        const attendance = student.currentAttendance || 'Not Scanned';
                        const statusColor = attendance === 'Present' ? 'bg-green-100 text-green-800' : 
                                          attendance === 'Late' || attendance === 'late' ? 'bg-orange-100 text-orange-800' :
                                          attendance === 'Absent' || attendance === 'absent' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800';
                        const timeDisplay = student.lastScanned || '—';
                      
                        return (
                          <tr key={student.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-5 font-medium">{student.lrn || student.id}</td>
                            <td className="px-6 py-5">{student.fullName || student.name}</td>
                            <td className="px-6 py-5">{student.section || '—'}</td>
                            <td className="px-6 py-5">{timeDisplay}</td>
                            <td className="px-6 py-5">
                              <span className={`px-4 py-2 ${statusColor} rounded-full text-sm font-semibold`}>
                                {attendance}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
                                <PencilSquareIcon className="w-5 h-5" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-5 text-center text-gray-500">
                          No students found for {selectedDate} | Section: {selectedSection} | Status: {selected}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handlePrintAttendanceLog}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-base flex items-center justify-center gap-3 shadow-md transition"
              >
                <PrinterIconSolid className="w-5 h-5" />
                Print
              </button>
            </div>
          </div>
        )}
      </div>
  );
}