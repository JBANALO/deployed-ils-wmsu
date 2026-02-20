import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Modal, TextInput, Image, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthProvider';
import { useAttendance } from '../context/AttendanceContext';

// Detect if running on web
const isWeb = typeof window !== 'undefined';
// Safe Platform access - only imported when not on web
let Platform = null;
if (!isWeb) {
  try {
    Platform = require('react-native').Platform;
  } catch (e) {
    Platform = { OS: 'android' };
  }
}

export default function ProfileScreen({ navigation }) {
  const { user, userData, logout, refreshUserData, changePassword } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [editForm, setEditForm] = useState({
    firstName: userData?.firstName || '',
    middleName: userData?.middleName || '',
    lastName: userData?.lastName || '',
    department: userData?.department || 'Elementary Department',
    employeeId: userData?.employeeId || '',
    phone: userData?.phone || '',
    subjects: userData?.subjects || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const result = await logout();
            if (result.success) {
              navigation.replace('Login');
            } else {
              Alert.alert('Error', result.error || 'Logout failed');
            }
          },
        },
      ]
    );
  };

  const getDisplayName = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const handleEditProfile = async () => {
    if (!editForm.firstName || !editForm.lastName) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const fullName = `${editForm.firstName} ${editForm.middleName ? editForm.middleName + ' ' : ''}${editForm.lastName}`;
      
      await updateDoc(userRef, {
        firstName: editForm.firstName,
        middleName: editForm.middleName,
        lastName: editForm.lastName,
        fullName: fullName,
        department: editForm.department,
        employeeId: editForm.employeeId,
        phone: editForm.phone,
        subjects: editForm.subjects,
      });

      await refreshUserData();

      Alert.alert('Success', 'Profile updated successfully');
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        Alert.alert('Success', 'Password updated successfully');
        setChangePasswordModalVisible(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    }
  };

  const pickImage = async (sourceType) => {
    try {
      let result;
      
      if (sourceType === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Photo library permission is required');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setPhotoModalVisible(false);
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadProfilePhoto = async (uri) => {
    setUploading(true);
    
    try {
      const filename = `profile_${user.uid}_${Date.now()}.jpg`;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/mynewapp-da23d.firebasestorage.app/o/profile_photos%2F${filename}?uploadType=media`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: blob,
      });
      
      if (uploadResponse.ok) {
        const storageRef = ref(storage, `profile_photos/${filename}`);
        const downloadURL = await getDownloadURL(storageRef);
        
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: downloadURL,
        });
        
        await refreshUserData();
        
        Alert.alert('Success', 'Profile photo updated');
      } else {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                photoURL: null,
              });

              await refreshUserData();

              Alert.alert('Success', 'Profile photo removed');
              setPhotoModalVisible(false);
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert('Error', 'Failed to remove photo');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Your account information</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setPhotoModalVisible(true)}
          >
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="account" size={60} color="#999" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Icon name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{getDisplayName()}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Teacher</Text>
          </View>
          <Text style={styles.userDepartment}>{userData?.department || 'WMSU ILS - Elementary Department'}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Icon name="email" size={24} color="#8B0000" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Icon name="badge-account" size={24} color="#8B0000" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{userData?.employeeId || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Icon name="phone" size={24} color="#8B0000" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userData?.phone || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Icon name="book-multiple" size={24} color="#8B0000" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Subjects</Text>
              <Text style={styles.infoValue}>{userData?.subjects || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setEditForm({
                firstName: userData?.firstName || '',
                middleName: userData?.middleName || '',
                lastName: userData?.lastName || '',
                department: userData?.department || 'Elementary Department',
                employeeId: userData?.employeeId || '',
                phone: userData?.phone || '',
                subjects: userData?.subjects || '',
              });
              setEditModalVisible(true);
            }}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="pencil" size={24} color="#8B0000" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Edit Profile</Text>
              <Text style={styles.actionSubtitle}>Update your personal information</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="lock-reset" size={24} color="#8B0000" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionSubtitle}>Update your password</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLogout}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Icon name="logout" size={24} color="#f44336" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#f44336' }]}>Logout</Text>
              <Text style={styles.actionSubtitle}>Sign out from your account</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={isWeb ? 'height' : (Platform?.OS === 'ios' ? 'padding' : 'height')}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Middle Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Middle Name (Optional)"
                  value={editForm.middleName}
                  onChangeText={(text) => setEditForm({ ...editForm, middleName: text })}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Department"
                  value={editForm.department}
                  onChangeText={(text) => setEditForm({ ...editForm, department: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Employee ID"
                  value={editForm.employeeId}
                  onChangeText={(text) => setEditForm({ ...editForm, employeeId: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subjects</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mathematics, Science"
                  value={editForm.subjects}
                  onChangeText={(text) => setEditForm({ ...editForm, subjects: text })}
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={changePasswordModalVisible}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={isWeb ? 'height' : (Platform?.OS === 'ios' ? 'padding' : 'height')}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setChangePasswordModalVisible(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password (min. 6 characters)"
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  secureTextEntry
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setChangePasswordModalVisible(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={photoModalVisible}
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <Text style={styles.photoModalTitle}>Profile Photo</Text>
            
            <TouchableOpacity 
              style={styles.photoOption}
              onPress={() => pickImage('camera')}
              disabled={uploading}
            >
              <Icon name="camera" size={24} color="#8B0000" />
              <Text style={styles.photoOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.photoOption}
              onPress={() => pickImage('library')}
              disabled={uploading}
            >
              <Icon name="image" size={24} color="#8B0000" />
              <Text style={styles.photoOptionText}>Choose from Library</Text>
            </TouchableOpacity>

            {userData?.photoURL && (
              <TouchableOpacity 
                style={[styles.photoOption, styles.photoOptionDanger]}
                onPress={removeProfilePhoto}
                disabled={uploading}
              >
                <Icon name="delete" size={24} color="#f44336" />
                <Text style={[styles.photoOptionText, { color: '#f44336' }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.photoCancelButton}
              onPress={() => setPhotoModalVisible(false)}
              disabled={uploading}
            >
              <Text style={styles.photoCancelText}>Cancel</Text>
            </TouchableOpacity>

            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#8B0000" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#8B0000', padding: 20, paddingTop: 50, paddingBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  profileCard: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarContainer: { marginBottom: 16, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#8B0000' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#8B0000' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FF6B35', borderRadius: 18, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  roleBadge: { backgroundColor: '#8B0000', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  userDepartment: { fontSize: 14, color: '#666', textAlign: 'center' },
  infoSection: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  actionsSection: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  actionIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, color: '#333', fontWeight: '600', marginBottom: 4 },
  actionSubtitle: { fontSize: 12, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalScroll: { flexGrow: 0 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, backgroundColor: '#e0e0e0', padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: '#8B0000', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  photoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  photoModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  photoModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  photoOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8, gap: 12 },
  photoOptionDanger: { backgroundColor: '#ffebee' },
  photoOptionText: { fontSize: 16, color: '#333', fontWeight: '600' },
  photoCancelButton: { padding: 16, alignItems: 'center', marginTop: 8 },
  photoCancelText: { fontSize: 16, color: '#8B0000', fontWeight: '600' },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  uploadingText: { fontSize: 16, color: '#8B0000', fontWeight: '600', marginTop: 12 },
});