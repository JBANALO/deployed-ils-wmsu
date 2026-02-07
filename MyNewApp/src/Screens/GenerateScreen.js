import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider'; 

export default function GenerateScreen() {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [section, setSection] = useState('');
  const [qrData, setQrData] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { user } = useAuth(); 

  
  useEffect(() => {
    if (user) {
      loadStudents();
    }
  }, [user]);

 
  const loadStudents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load students from backend API
      const response = await fetch(`http://192.168.0.153:5000/api/students?teacherId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle both wrapped response and direct array
      let rawStudents = [];
      if (result.success || result.status === 'success') {
        rawStudents = result.data || result.students || [];
      } else if (Array.isArray(result)) {
        rawStudents = result;
      } else {
        throw new Error(result.message || result.error || 'Failed to load students');
      }
      
      // Process students to ensure consistent naming
      const studentsList = rawStudents.map(student => ({
        ...student,
        name: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student',
        studentId: student.studentId || student.lrn || student.id,
        qrCode: student.qrCode || student.qr_code
      }));
      setStudents(studentsList);
      console.log(`✓ Loaded ${studentsList.length} students`);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students from database');
    } finally {
      setLoading(false);
    }
  };


  const handleAddStudent = async () => {
    if (!name.trim() || !studentId.trim() || !section.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add students');
      return;
    }

    setLoading(true);
    try {
      const studentData = {
        name: name.trim(),
        studentId: studentId.trim(),
        section: section.trim(),
        teacherId: user.id, 
        teacherName: user.name, // ✅ For reference
        createdAt: new Date().toISOString(),
      };

      // Add student via backend API
      const response = await fetch('http://192.168.0.153:5000/api/students', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      const result = await response.json();
      
      if (result.success || result.status === 'success') {
        Alert.alert('Success', `${name} added successfully!`);
        
        // Clear form
        setName('');
        setStudentId('');
        setSection('');
        
        // Reload students list
        loadStudents();
      } else {
        throw new Error(result.message || 'Failed to add student');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert('Error', 'Failed to add student to database');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = (student) => {
    const data = JSON.stringify({
      name: student.name || student.fullName,
      studentId: student.lrn || student.studentId || student.id, // Use LRN first
      section: student.section,
      teacherId: student.teacherId || user?.id, // Include teacherId in QR
    });
    setQrData(data);
    setSelectedStudent(student);
  };

  const handleDeleteStudent = async (studentToDelete) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${studentToDelete.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Delete student via backend API
              const response = await fetch(`http://192.168.0.153:5000/api/students/${studentToDelete.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${user.token}`,
                  'Content-Type': 'application/json',
                },
              });

              const result = await response.json();
              
              if (result.success || result.status === 'success') {
                Alert.alert('Success', 'Student deleted successfully');
                loadStudents();
                
                // Clear QR if deleted student was selected
                if (selectedStudent?.id === studentToDelete.id) {
                  setQrData('');
                  setSelectedStudent(null);
                }
              } else {
                throw new Error(result.message || 'Failed to delete student');
              }
            } catch (error) {
              console.error('Error deleting student:', error);
              Alert.alert('Error', 'Failed to delete student');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Group students by section
  const groupedStudents = students.reduce((acc, student) => {
    const section = student.section || 'No Section';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(student);
    return acc;
  }, {});

  // ✅ Show loading if no user
  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Generate QR Codes</Text>
            <Text style={styles.headerSubtitle}>Add students and generate QR codes</Text>
          </View>
          <View style={styles.statsContainer}>
            <Icon name="account-group" size={24} color="#fff" />
            <Text style={styles.statsText}>{students.length}</Text>
          </View>
        </View>

        {/* Add Student Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}> Add New Student</Text>
          
          <Text style={styles.label}>Student Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Juan Dela Cruz"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Student ID / LRN</Text>
          <TextInput
            style={styles.input}
            value={studentId}
            onChangeText={setStudentId}
            placeholder="e.g., LRN_2024001"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Section</Text>
          <TextInput
            style={styles.input}
            value={section}
            onChangeText={setSection}
            placeholder="e.g., Grade 4A"
            placeholderTextColor="#999"
          />

          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddStudent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="plus-circle" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Student</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* QR Code Display */}
        {qrData && selectedStudent ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}> Scan This QR Code</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={qrData}
                size={200}
                backgroundColor="white"
              />
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.qrInfo}>{selectedStudent.name}</Text>
              <Text style={styles.qrSubInfo}>{selectedStudent.studentId}</Text>
              <Text style={styles.qrSection}>{selectedStudent.section}</Text>
            </View>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setQrData('');
                setSelectedStudent(null);
              }}
            >
              <Text style={styles.clearButtonText}>Clear QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : null}

       
        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}> Students List</Text>
            <TouchableOpacity onPress={loadStudents} disabled={loading}>
              <Icon name="refresh" size={24} color="#8B0000" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={styles.loadingText}>Loading students...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="account-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No students added yet</Text>
              <Text style={styles.emptySubText}>Add your first student above</Text>
            </View>
          ) : (
            <>
              {Object.keys(groupedStudents).sort().map((sectionName) => (
                <View key={sectionName} style={styles.sectionGroup}>
                  <Text style={styles.sectionGroupTitle}>
                     {sectionName} ({groupedStudents[sectionName].length})
                  </Text>
                  {groupedStudents[sectionName].map((student) => (
                    <View key={student.id} style={styles.studentItem}>
                      <View style={styles.studentItemLeft}>
                        <Icon name="account-circle" size={40} color="#8B0000" />
                        <View style={styles.studentDetails}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentId}>{student.studentId}</Text>
                        </View>
                      </View>
                      <View style={styles.studentActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleGenerateQR(student)}
                        >
                          <Icon name="qrcode" size={24} color="#4caf50" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteStudent(student)}
                        >
                          <Icon name="delete" size={24} color="#f44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to Use:</Text>
          <Text style={styles.instructionText}>1. Add students using the form above</Text>
          <Text style={styles.instructionText}>2. Tap the QR icon to generate their QR code</Text>
          <Text style={styles.instructionText}>3. Students scan their QR code during attendance</Text>
          <Text style={styles.instructionText}>4. System automatically records morning/afternoon attendance</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8B0000',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#8B0000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 16,
    marginBottom: 0,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B0000',
    marginBottom: 16,
  },
  studentInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qrSubInfo: {
    fontSize: 14,
    color: '#8B0000',
    marginTop: 4,
  },
  qrSection: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  clearButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  sectionGroup: {
    marginBottom: 20,
  },
  sectionGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#8B0000',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  studentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentId: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  instructionsCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    margin: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 8,
    paddingLeft: 8,
  },
});
