import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, CameraIcon, Cog6ToothIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import { UserContext } from "../../context/UserContext";

const API_BASE = import.meta.env.VITE_API_URL;

export default function SuperAdminProfile() {
  const { adminUser, updateUser, setProfileImageFile } = useContext(UserContext);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({
    firstName: adminUser?.firstName || '',
    lastName: adminUser?.lastName || '',
    username: adminUser?.username || '',
    email: adminUser?.email || '',
    phone: adminUser?.phone || '',
    profileImage: adminUser?.profileImage || ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (formData.profileImage && typeof formData.profileImage === 'object') {
      const url = URL.createObjectURL(formData.profileImage);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [formData.profileImage]);

  // Update form data when adminUser changes (fixes refresh issue)
  useEffect(() => {
    console.log('SuperAdminProfile - adminUser changed:', adminUser);
    if (adminUser) {
      const newFormData = {
        firstName: adminUser.firstName || '',
        lastName: adminUser.lastName || '',
        username: adminUser.username || '',
        email: adminUser.email || '',
        phone: adminUser.phone || '',
        profileImage: (adminUser.profileImage && adminUser.profileImage !== 'null' && adminUser.profileImage !== 'undefined') ? adminUser.profileImage : ''
      };
      console.log('SuperAdminProfile - setting formData to:', newFormData);
      setFormData(newFormData);
    }
  }, [adminUser]);

  // Fetch complete user data on component mount if missing phone, department, or profileImage
  useEffect(() => {
    const fetchCompleteUserData = async () => {
      if (adminUser && (!adminUser.phone || !adminUser.profileImage)) {
        try {
          console.log('SuperAdminProfile - fetching complete superadmin user data...');
          const response = await axios.get('/super-admin/me');
          if (response.data?.data?.user) {
            const completeUser = response.data.data.user;
            console.log('SuperAdminProfile - fetched complete superadmin user:', completeUser);
            updateUser(completeUser);
          }
        } catch (error) {
          console.error('SuperAdminProfile - Error fetching complete superadmin user data:', error);
        }
      }
    };

    fetchCompleteUserData();
  }, [adminUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setFormData(prev => ({
        ...prev,
        profileImage: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      
      if (formData.profileImage && typeof formData.profileImage === 'object') {
        formDataToSend.append('profileImage', formData.profileImage);
      }

      const response = await axios.put('/super-admin/update-profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update user context
      updateUser(response.data.user);

      // Update profile image file in context if changed
      if (formData.profileImage && typeof formData.profileImage === 'object') {
        setProfileImageFile(formData.profileImage);
      }

      toast.success('Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (adminUser) {
      setFormData({
        firstName: adminUser.firstName || '',
        lastName: adminUser.lastName || '',
        username: adminUser.username || '',
        email: adminUser.email || '',
        phone: adminUser.phone || '',
        profileImage: adminUser.profileImage || ''
      });
    }
    setEditMode(false);
  };

  const getProfileImageSrc = () => {
    if (preview) {
      return preview;
    }
    
    if (formData.profileImage && formData.profileImage !== 'null' && formData.profileImage !== 'undefined') {
      if (typeof formData.profileImage === 'object') {
        return URL.createObjectURL(formData.profileImage);
      }
      
      // Try different URL constructions for production compatibility
      const possibleUrls = [
        `${API_BASE.replace(/\/api$/, '')}${formData.profileImage}`,
        `${API_BASE}${formData.profileImage}`,
        formData.profileImage.startsWith('/') ? formData.profileImage : `/${formData.profileImage}`
      ];
      return possibleUrls[0]; // Default to first option
    }
    
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-900 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ShieldCheckIcon className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Super Admin Profile</h1>
                <p className="text-red-100">Manage your super administrator account</p>
              </div>
            </div>
            <button
              onClick={() => editMode ? handleCancel() : setEditMode(true)}
              className="bg-white text-red-800 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                  {getProfileImageSrc() ? (
                    <img
                      src={getProfileImageSrc()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('SuperAdminProfile - Image failed to load, trying fallback URLs');
                        const originalSrc = e.target.src;
                        const possibleUrls = [
                          `${API_BASE}${formData.profileImage}`,
                          formData.profileImage.startsWith('/') ? formData.profileImage : `/${formData.profileImage}`,
                          '/default-avatar.jpeg'
                        ];
                        
                        const currentIndex = possibleUrls.findIndex(url => originalSrc.includes(url));
                        if (currentIndex < possibleUrls.length - 1) {
                          e.target.src = possibleUrls[currentIndex + 1];
                        } else {
                          e.target.onerror = null; 
                          e.target.src = "/default-avatar.jpeg"; 
                        }
                      }}
                    />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-gray-400" />
                  )}
                </div>
                {editMode && (
                  <label className="absolute bottom-0 right-0 bg-red-800 text-white p-2 rounded-full cursor-pointer hover:bg-red-700 transition-colors">
                    <CameraIcon className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="mt-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {formData.firstName} {formData.lastName}
                </h2>
                <p className="text-gray-500">Super Administrator</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                      editMode 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                      editMode 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                      editMode 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                      editMode 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                      editMode 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            {editMode && (
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
