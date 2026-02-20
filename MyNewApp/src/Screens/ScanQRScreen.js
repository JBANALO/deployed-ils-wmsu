import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Modal, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider';
import { attendanceAPI } from '../services/api';

const API_BASE_URL = 'https://deployed-ils-wmsu-production.up.railway.app/api';

export default function ScanQRScreen() {
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [attendancePeriod, setAttendancePeriod] = useState('morning');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { addAttendance, checkAttendanceStatus } = useAttendance();
  const { user, userData } = useAuth();

  // Get teacher name
  const getTeacherName = () => {
    if (!user) return 'Teacher';
    if (userData?.firstName) return `${userData.firstName} ${userData.lastName || ''}`.trim();
    if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    return 'Teacher';
  };
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

 
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);


  const getPeriodMessage = () => {
    const hour = currentTime.getHours();
    const period = hour < 12 ? 'morning' : 'afternoon';
    
    if (period === 'morning') {
      if (hour < 8) return { text: '✓ Before 8:00 AM - PRESENT', color: '#4caf50', icon: 'check-circle' };
      if (hour < 10) return { text: ' 8:00-9:59 AM - LATE', color: '#ff9800', icon: 'clock-alert' };
      return { text: ' After 10:00 AM - ABSENT', color: '#f44336', icon: 'close-circle' };
    } else {
      if (hour < 14) return { text: '✓ Before 2:00 PM - PRESENT', color: '#4caf50', icon: 'check-circle' };
      if (hour < 15) return { text: ' 2:00-2:59 PM - LATE', color: '#ff9800', icon: 'clock-alert' };
      return { text: ' After 3:00 PM - ABSENT', color: '#f44336', icon: 'close-circle' };
    }
  };

  const periodMsg = getPeriodMessage();

  
  const handleBarCodeScanned = async ({ data }) => {
    if (hasScanned || !user) return;
    
    setHasScanned(true);
    setScanning(false);

    try {
      console.log('📱 QR Scan - Raw data:', data);
      const qrData = JSON.parse(data);
      console.log('📱 QR Scan - Parsed data:', qrData);
      
      // Extract studentId from various possible fields
      const studentIdFromQR = qrData.studentId || qrData.lrn || qrData.id;
      
      if (studentIdFromQR) {
        try {
          // Get all students and check if the scanned student exists
          const response = await fetch(`https://deployed-ils-wmsu-production.up.railway.app/api/students`, {
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          });

          const result = await response.json();
          
          if (result.success || result.status === 'success') {
            const students = result.data || result.students || [];
            
            // Find the student in the database
            const student = students.find(s => 
              s.id === studentIdFromQR || 
              s.studentId === studentIdFromQR ||
              s.lrn === studentIdFromQR
            );
            
            console.log('📱 QR Scan - Student found:', student ? 'YES' : 'NO');
            console.log('📱 QR Scan - Searching for ID:', studentIdFromQR);
            
            if (!student) {
              Alert.alert(
                'Student Not Found',
                'This student is not registered in the system.',
                [{ text: 'OK', onPress: () => resetScanner() }]
              );
              return;
            }
            
            // For now, allow all registered students (can add teacher filtering later)
            console.log('Found student:', student);
            
            // Set the scanned student data with proper formatting (include parent email for auto-notification)
            setScannedStudent({
              ...qrData,
              name: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
              studentId: student.lrn || student.studentId || student.id, // Use LRN as primary ID
              lrn: student.lrn || student.studentId,
              section: student.section || 'Unknown Section',
              gradeLevel: student.gradeLevel || 'Unknown Grade',
              parentEmail: student.parentEmail || '', // For auto email notification
              parentContact: student.parentContact || '',
              contactEmail: student.contactEmail || student.email || ''
            });
          } else {
            Alert.alert(
              'Error',
              'Failed to verify student. Please try again.',
              [{ text: 'OK', onPress: () => resetScanner() }]
            );
            return;
          }

          // Also record to backend database
          try {
            console.log('📱 Recording attendance to backend for student:', studentIdFromQR);
            const backendResult = await attendanceAPI.recordAttendance(
              studentIdFromQR, 
              data, 
              'Mobile QR Scanner'
            );
            
            if (backendResult.success) {
              console.log('✅ Backend attendance recorded:', backendResult.data.studentName);
            } else {
              console.log('⚠️ Backend recording failed:', backendResult.message);
            }
          } catch (backendError) {
            console.log('⚠️ Backend connection failed:', backendError.message);
            // Don't block the flow if backend fails
          }

        } catch (error) {
          console.error('Error verifying student:', error);
        }
      } else {
        console.log('📱 QR Scan - No valid student ID found in QR data');
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain valid student information.',
          [{ text: 'OK', onPress: () => resetScanner() }]
        );
        return;
      }

      const { status, period } = checkAttendanceStatus();
      setAttendanceStatus(status);
      setAttendancePeriod(period);

      // Update with scan time and status (preserve parentEmail from earlier setScannedStudent)
      setScannedStudent(prev => ({
        ...prev,
        name: prev?.name || qrData.name || 'Unknown Student',
        studentId: prev?.studentId || studentIdFromQR || 'N/A',
        section: prev?.section || qrData.section || 'N/A',
        status: status,
        period: period,
        scanTime: currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      }));
    } catch (e) {
     
      Alert.alert(
        'Invalid QR Code',
        'This QR code format is not recognized. Please generate a new one.',
        [{ text: 'OK', onPress: () => resetScanner() }]
      );
    }
  };

  const handleMarkPresent = () => {
    setAttendanceStatus('present');
  };

  const handleMarkLate = () => {
    setAttendanceStatus('late');
  };

  const handleMarkAbsent = () => {
    setAttendanceStatus('absent');
  };

  // Auto-send email to parent via server API (truly automatic - no user interaction needed)
  const sendAutoEmailToParent = async (student, status, period, scanTime) => {
    const recipientEmail = student.parentEmail || student.contactEmail || '';
    
    if (!recipientEmail) {
      console.log('📧 No parent email found for:', student.name);
      return { success: false, reason: 'No email' };
    }

    try {
      console.log('📧 Sending automatic email to:', recipientEmail);
      
      const response = await fetch(`${API_BASE_URL}/attendance/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentEmail: recipientEmail,
          studentName: student.name,
          studentLRN: student.studentId || student.lrn || 'N/A',
          gradeLevel: student.gradeLevel || 'N/A',
          section: student.section || 'N/A',
          status: status,
          period: period,
          time: scanTime,
          teacherName: getTeacherName()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Email sent successfully to:', recipientEmail);
        return { success: true };
      } else {
        console.log('❌ Email sending failed:', result.message);
        return { success: false, reason: result.message };
      }
    } catch (error) {
      console.log('❌ Email API error:', error.message);
      return { success: false, reason: error.message };
    }
  };

  const handleConfirmAttendance = async () => {
    try {
      // Add null checking
      if (!scannedStudent) {
        Alert.alert('Error', 'No student data found. Please scan again.');
        return;
      }

      if (!scannedStudent.studentId) {
        Alert.alert('Error', 'Invalid student ID. Please scan again.');
        return;
      }

      setSendingEmail(true);
     
      await addAttendance(
        scannedStudent.studentId,
        attendancePeriod,
        attendanceStatus
      );
      
      const periodText = attendancePeriod === 'morning' ? 'Morning' : 'Afternoon';
      
      // Auto-send email to parent (server-side - truly automatic)
      const emailResult = await sendAutoEmailToParent(scannedStudent, attendanceStatus, attendancePeriod, scannedStudent.scanTime);
      
      setSendingEmail(false);
      
      // Show custom success modal with real icons
      setSuccessData({
        studentName: scannedStudent.name,
        status: attendanceStatus,
        period: periodText,
        time: scannedStudent.scanTime,
        emailSent: emailResult.success,
        emailReason: emailResult.reason || '',
        parentEmail: scannedStudent.parentEmail || scannedStudent.contactEmail || ''
      });
      setSuccessModalVisible(true);
      
    } catch (error) {
      setSendingEmail(false);
      console.error('Error recording attendance:', error);
      Alert.alert('Error', 'Failed to record attendance. Please try again.');
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    setSuccessData(null);
    resetScanner();
  };

  const resetScanner = () => {
    setScannedStudent(null);
    setScanning(true);
    setHasScanned(false);
    setAttendanceStatus('present');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={64} color="#8B0000" />
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <Text style={styles.headerSubtitle}>
              {currentTime.getHours() < 12 ? 'Morning' : 'Afternoon'} Session
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        <View style={[styles.warningBanner, { backgroundColor: periodMsg.color }]}>
          <Icon name={periodMsg.icon} size={20} color="#fff" />
          <Text style={styles.warningText}>{periodMsg.text}</Text>
        </View>

        {scanning ? (
          <View style={styles.scannerCard}>
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                Position QR code within the frame
              </Text>
              <Text style={[styles.instructionText, styles.boldText]}>
                {currentTime.getHours() < 12 ? 'Morning' : 'Afternoon'} attendance will be recorded automatically
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.resultCard}>
            <View style={[
              styles.successIcon,
              attendanceStatus === 'absent' ? styles.absentIcon :
              attendanceStatus === 'late' ? styles.lateIcon : styles.presentIcon
            ]}>
              <Icon 
                name={
                  attendanceStatus === 'absent' ? "close" :
                  attendanceStatus === 'late' ? "clock-alert" : "check"
                } 
                size={48} 
                color="#fff" 
              />
            </View>

            <View style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <Icon name="account-circle" size={40} color="#fff" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.studentName}>{scannedStudent?.name}</Text>
                  <View style={styles.badgeContainer}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.studentStatus}>
                        {attendanceStatus.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodText}>
                        {scannedStudent?.period === 'morning' ? ' MORNING' : ' AFTERNOON'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.studentId}>{scannedStudent?.studentId}</Text>
                  <Text style={styles.studentSection}>Section: {scannedStudent?.section}</Text>
                </View>
              </View>
              <View style={styles.timeInfo}>
                <Icon name="clock-outline" size={16} color="#fff" />
                <Text style={styles.scanTimeText}>
                  Scanned: {scannedStudent?.scanTime}
                </Text>
              </View>
            </View>

            <View style={[
              styles.autoStatusMessage,
              attendanceStatus === 'absent' ? styles.absentMessage :
              attendanceStatus === 'late' ? styles.lateMessage : styles.presentMessage
            ]}>
              <Text style={styles.autoStatusText}>
                {attendanceStatus === 'absent' 
                  ? ` Auto-marked ABSENT (${scannedStudent?.period === 'morning' ? 'After 10 AM' : 'After 3 PM'})`
                  : attendanceStatus === 'late'
                  ? ` Auto-marked LATE (${scannedStudent?.period === 'morning' ? '8-9:59 AM' : '2-2:59 PM'})`
                  : ` Auto-marked PRESENT (${scannedStudent?.period === 'morning' ? 'Before 8 AM' : 'Before 2 PM'})`}
              </Text>
            </View>

        
            <Text style={styles.overrideLabel}>Override if needed:</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.presentButton,
                  attendanceStatus === 'present' && styles.activeButton
                ]} 
                onPress={handleMarkPresent}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.lateButton,
                  attendanceStatus === 'late' && styles.activeButton
                ]} 
                onPress={handleMarkLate}
              >
                <Icon name="clock-alert" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Late</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.absentButton,
                  attendanceStatus === 'absent' && styles.activeButton
                ]} 
                onPress={handleMarkAbsent}
              >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Absent</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.confirmButton, sendingEmail && styles.disabledButton]} 
              onPress={handleConfirmAttendance}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.confirmButtonText, { marginLeft: 8 }]}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Attendance</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Success Modal with Real Icons */}
        <Modal
          visible={successModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handleSuccessModalClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModal}>
              {/* Status Icon */}
              <View style={[
                styles.successModalIcon,
                successData?.status === 'present' && { backgroundColor: '#4caf50' },
                successData?.status === 'late' && { backgroundColor: '#ff9800' },
                successData?.status === 'absent' && { backgroundColor: '#f44336' }
              ]}>
                <Icon 
                  name={
                    successData?.status === 'present' ? 'check-circle' :
                    successData?.status === 'late' ? 'clock-alert' : 'close-circle'
                  } 
                  size={60} 
                  color="#fff" 
                />
              </View>

              {/* Title */}
              <Text style={styles.successModalTitle}>
                {successData?.period} Attendance Recorded!
              </Text>

              {/* Details */}
              <View style={styles.successModalDetails}>
                <View style={styles.successModalRow}>
                  <Icon name="account" size={20} color="#666" />
                  <Text style={styles.successModalLabel}>Student:</Text>
                  <Text style={styles.successModalValue}>{successData?.studentName}</Text>
                </View>
                <View style={styles.successModalRow}>
                  <Icon 
                    name={
                      successData?.status === 'present' ? 'check-circle' :
                      successData?.status === 'late' ? 'clock-alert' : 'close-circle'
                    } 
                    size={20} 
                    color={
                      successData?.status === 'present' ? '#4caf50' :
                      successData?.status === 'late' ? '#ff9800' : '#f44336'
                    } 
                  />
                  <Text style={styles.successModalLabel}>Status:</Text>
                  <Text style={[
                    styles.successModalValue,
                    { 
                      fontWeight: 'bold',
                      color: successData?.status === 'present' ? '#4caf50' :
                             successData?.status === 'late' ? '#ff9800' : '#f44336'
                    }
                  ]}>
                    {successData?.status?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.successModalRow}>
                  <Icon name="clock-outline" size={20} color="#666" />
                  <Text style={styles.successModalLabel}>Time:</Text>
                  <Text style={styles.successModalValue}>{successData?.time}</Text>
                </View>
              </View>

              {/* Email Status */}
              <View style={[
                styles.emailStatusBanner,
                successData?.emailSent ? { backgroundColor: '#e8f5e9' } : 
                successData?.parentEmail ? { backgroundColor: '#fff3e0' } : { backgroundColor: '#f5f5f5' }
              ]}>
                <Icon 
                  name={
                    successData?.emailSent ? 'email-check' : 
                    successData?.parentEmail ? 'email-alert' : 'email-off'
                  } 
                  size={24} 
                  color={
                    successData?.emailSent ? '#4caf50' : 
                    successData?.parentEmail ? '#ff9800' : '#999'
                  } 
                />
                <Text style={[
                  styles.emailStatusText,
                  successData?.emailSent ? { color: '#2e7d32' } :
                  successData?.parentEmail ? { color: '#f57c00' } : { color: '#666' }
                ]}>
                  {successData?.emailSent 
                    ? 'Email sent to parent automatically!' 
                    : successData?.parentEmail 
                      ? `Failed to send email: ${successData?.emailReason || 'Unknown error'}`
                      : 'No parent email registered'}
                </Text>
              </View>

              {/* OK Button */}
              <TouchableOpacity 
                style={styles.successModalButton}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.successModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerCard: { 
    backgroundColor: '#8B0000', 
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  timeContainer: { alignItems: 'flex-end' },
  timeText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  dateText: { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 2 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  warningText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  scannerCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 24, 
    alignItems: 'center', 
    margin: 16,
    flex: 1
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#8B0000',
    borderRadius: 12,
  },
  instructions: { marginTop: 24, alignItems: 'center' },
  instructionText: { fontSize: 13, color: '#666', marginBottom: 4, textAlign: 'center' },
  boldText: { fontWeight: '600', marginTop: 8 },
  resultCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 24, 
    alignItems: 'center', 
    margin: 16 
  },
  successIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  presentIcon: { backgroundColor: '#4caf50' },
  lateIcon: { backgroundColor: '#ff9800' },
  absentIcon: { backgroundColor: '#f44336' },
  studentCard: { 
    backgroundColor: '#8B0000', 
    borderRadius: 12, 
    padding: 16, 
    width: '100%', 
    marginBottom: 16 
  },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  badgeContainer: { flexDirection: 'row', gap: 6, marginTop: 4 },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  periodBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studentStatus: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  periodText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  studentId: { fontSize: 10, color: '#fff', opacity: 0.8, marginTop: 2 },
  studentSection: { fontSize: 11, color: '#fff', opacity: 0.9, marginTop: 2 },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  scanTimeText: { fontSize: 12, color: '#fff', opacity: 0.9 },
  autoStatusMessage: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  presentMessage: { backgroundColor: '#e8f5e9' },
  lateMessage: { backgroundColor: '#fff3e0' },
  absentMessage: { backgroundColor: '#ffebee' },
  autoStatusText: { 
    fontSize: 13, 
    fontWeight: '600',
    textAlign: 'center',
  },
  overrideLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 12 },
  actionButton: { 
    flex: 1, 
    padding: 10, 
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    opacity: 0.5,
  },
  activeButton: { opacity: 1, borderWidth: 2, borderColor: '#333' },
  presentButton: { backgroundColor: '#4caf50' },
  lateButton: { backgroundColor: '#ff9800' },
  absentButton: { backgroundColor: '#f44336' },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  confirmButton: {
    width: '100%',
    backgroundColor: '#8B0000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { 
    width: '100%', 
    backgroundColor: '#e0e0e0', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  cancelButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.7 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successModalIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  successModalDetails: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  successModalLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 70,
  },
  successModalValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  emailStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  emailStatusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  successModalButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
