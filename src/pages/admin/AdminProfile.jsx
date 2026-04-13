import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, CameraIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import { UserContext } from "../../context/UserContext";

const API_BASE = import.meta.env.VITE_API_URL;

export default function AdminProfile() {
  const { adminUser, updateUser, setProfileImageFile } = useContext(UserContext);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    profileImage: ''
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

  // Initialize form data from multiple sources with proper fallbacks
  useEffect(() => {
    const initializeFormData = () => {
      console.log('AdminProfile - initializing form data...');
      
      // Try multiple sources for user data
      let userData = adminUser;
      
      // If no adminUser, try localStorage
      if (!userData) {
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
            userData = JSON.parse(storedUser);
            console.log('AdminProfile - using stored user data:', userData);
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem("user");
        }
      }
      
      // If we have user data, update form
      if (userData && userData.id) {
        const newFormData = {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          username: userData.username || '',
          email: userData.email || '',
          phone: userData.phone || '',
          profileImage: (userData.profileImage && userData.profileImage !== 'null' && userData.profileImage !== 'undefined') ? userData.profileImage : ''
        };
        console.log('AdminProfile - setting formData to:', newFormData);
        setFormData(newFormData);
        setLoading(false);
      } else {
        // No user data available, fetch fresh data
        fetchFreshUserData();
      }
    };
    
    initializeFormData();
  }, [adminUser]);

  // Fetch fresh user data when needed
  const fetchFreshUserData = async () => {
    try {
      console.log('AdminProfile - fetching fresh user data...');
      const response = await axios.get('/auth/me');
      
      // Handle different response structures
      let freshUser = null;
      if (response.data?.user) {
        freshUser = response.data.user;
      } else if (response.data?.data?.user) {
        freshUser = response.data.data.user;
      } else if (response.data?.data) {
        freshUser = response.data.data;
      }
      
      if (freshUser) {
        console.log('AdminProfile - fetched fresh user:', freshUser);
        updateUser(freshUser);
        
        const newFormData = {
          firstName: freshUser.firstName || '',
          lastName: freshUser.lastName || '',
          username: freshUser.username || '',
          email: freshUser.email || '',
          phone: freshUser.phone || '',
          profileImage: (freshUser.profileImage && freshUser.profileImage !== 'null' && freshUser.profileImage !== 'undefined') ? freshUser.profileImage : ''
        };
        setFormData(newFormData);
      }
    } catch (error) {
      console.error('AdminProfile - Error fetching fresh user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && adminUser) {
        fetchFreshUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [adminUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    setFormData(prev => ({ ...prev, profileImage: file }));
    setProfileImageFile(file); // <-- update context immediately
    toast.success('Image selected! Click "Save Changes" to upload.');
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const submitData = { ...formData, username: formData.username || formData.email.split('@')[0] };
    setSaving(true);

    try {
      console.log('AdminProfile - submitting profile update:', submitData);
      
      const formDataSubmit = new FormData();
      Object.entries(submitData).forEach(([key, value]) => {
        if (key === 'profileImage' && value instanceof File) {
          formDataSubmit.append(key, value);
        } else if (key !== 'profileImage') {
          formDataSubmit.append(key, value);
        }
      });

      const response = await axios.put('/auth/update-profile', formDataSubmit, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('AdminProfile - update response:', response.data);

      // Handle different response structures
      let updatedUser = null;
      if (response.data?.user) {
        updatedUser = response.data.user;
      } else if (response.data?.data?.user) {
        updatedUser = response.data.data.user;
      } else if (response.data?.data) {
        updatedUser = response.data.data;
      } else {
        // Fallback: create updated user from form data
        updatedUser = {
          ...adminUser,
          ...submitData,
          id: adminUser?.id || 'admin-001',
          role: adminUser?.role || 'admin'
        };
      }

      console.log('AdminProfile - final updated user:', updatedUser);
      
      // Update context and localStorage
      updateUser(updatedUser);
      
      // Update form data immediately
      setFormData({
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        profileImage: updatedUser.profileImage || ''
      });

      toast.success('Profile updated successfully!');
      setEditMode(false);
      
      // Force a fresh data fetch to confirm persistence
      setTimeout(() => {
        fetchFreshUserData();
      }, 1000);
      
    } catch (error) {
      console.error('AdminProfile - Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: adminUser?.firstName || '',
      lastName: adminUser?.lastName || '',
      username: adminUser?.username || '',
      email: adminUser?.email || '',
      phone: adminUser?.phone || '',
      profileImage: adminUser?.profileImage || ''
    });
    setProfileImageFile(null); // reset context file
    setEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and account settings</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile data...</p>
          </div>
        )}

        {/* Profile Card */}
        {!loading && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-red-800 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Personal Information</h2>
            </div>

            <div className="p-8">
              {/* Profile Image */}
              <div className="flex items-center gap-8 mb-10">
                <div className="relative">
                  {formData.profileImage ? (
            typeof formData.profileImage === 'object' ? (
              // Newly selected image (file object)
              <img
                src={URL.createObjectURL(formData.profileImage)}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-red-700"
              />
            ) : (
              // String image: either absolute URL or relative path from backend
              <img
                src={
                  // Only use preview if we have a newly selected file (edit mode)
                  editMode && preview ? preview :
                  (typeof formData.profileImage === 'string' 
                    ? (formData.profileImage.startsWith('http')
                        ? formData.profileImage
                        : (() => {
                            // Handle different image path formats for production compatibility
                            if (!formData.profileImage || formData.profileImage === 'null' || formData.profileImage === 'undefined') {
                              return '/default-avatar.jpeg';
                            }
                            
                            // Try different URL constructions for production compatibility
                            const possibleUrls = [
                              // Remove /api from base and add path
                              `${API_BASE.replace(/\/api$/, '')}${formData.profileImage}`,
                              // Keep /api and add path
                              `${API_BASE}${formData.profileImage}`,
                              // Direct path if it starts with /
                              formData.profileImage.startsWith('/') ? formData.profileImage : `/${formData.profileImage}`,
                              // Fallback to default
                              '/default-avatar.jpeg'
                            ];
                            console.log('AdminProfile - Trying image URLs:', possibleUrls);
                            return possibleUrls[0]; // Default to first option
                          })()
                      )
                    : '/default-avatar.jpeg')
                }
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-red-700"
                onError={(e) => { 
                  console.log('AdminProfile - Image failed to load, trying fallback URLs');
                  const originalSrc = e.target.src;
                  
                  // Define fallback URLs in order
                  const fallbackUrls = [
                    `${API_BASE.replace(/\/api$/, '')}${formData.profileImage}`,
                    `${API_BASE}${formData.profileImage}`,
                    formData.profileImage.startsWith('/') ? formData.profileImage : `/${formData.profileImage}`,
                    '/default-avatar.jpeg'
                  ];
                  
                  // Find current index
                  const currentIndex = fallbackUrls.findIndex(url => originalSrc.includes(url));
                  
                  // Try next URL or set to default
                  if (currentIndex < fallbackUrls.length - 1) {
                    console.log('AdminProfile - Trying next URL:', fallbackUrls[currentIndex + 1]);
                    e.target.src = fallbackUrls[currentIndex + 1];
                  } else {
                    console.log('AdminProfile - All URLs failed, using default avatar');
                    e.target.onerror = null; 
                    e.target.src = "/default-avatar.jpeg"; 
                  }
                }}
              />
            )
          ) : (
            // Default avatar
            <UserCircleIcon className="w-32 h-32 text-gray-400 border-4 border-red-700 rounded-full" />
          )}

          {editMode && (
            <label className="absolute bottom-0 right-0 bg-red-600 text-white p-3 rounded-full cursor-pointer hover:bg-red-700 transition-colors">
              <CameraIcon className="w-5 h-5" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formData.firstName} {formData.lastName}
              </h3>
              <p className="text-gray-600">@{formData.username}</p>
              <p className="text-gray-500 text-sm">{formData.email}</p>
            </div>
          </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={true}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-6 pt-8 border-t border-gray-200">
                {editMode && (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </form>
            
            {/* Edit Profile button outside form */}
            {!editMode && (
              <div className="flex gap-6 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    console.log('Edit Profile button clicked');
                    setEditMode(true);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
