import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ArrowLeftIcon, CameraIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";

export default function AdminProfile() {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    profileImage: ''
  });
  const navigate = useNavigate();

  // Fetch admin user data
  useEffect(() => {
    const fetchAdminUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Try to get user info from stored data first
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.role === 'admin') {
              setAdminUser(user);
              setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                username: user.username || '',
                email: user.email || '',
                phone: user.phone || '',
                profileImage: user.profileImage || ''
              });
              setLoading(false);
              return;
            }
          }
          
          // If no stored user or not admin, fetch from API
          const response = await axios.get('/auth/me');
          if (response.data?.user?.role === 'admin') {
            const user = response.data.user;
            setAdminUser(user);
            setFormData({
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              username: user.username || '',
              email: user.email || '',
              phone: user.phone || '',
              profileImage: user.profileImage || ''
            });
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      } catch (error) {
        console.error('Error fetching admin user:', error);
        toast.error('Error loading profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminUser();
  }, []);

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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      // Store file for form submission
      setFormData(prev => ({
        ...prev,
        profileImage: file // Store the actual file object, not base64
      }));
      
      toast.success('Image selected! Click "Save Changes" to upload.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted - editMode:', editMode, 'saving:', saving);
    
    if (saving) {
      console.log('Already saving, ignoring submission');
      return;
    }
    
    // Ensure username is not empty - use email as fallback
    const submitData = {
      ...formData,
      username: formData.username || formData.email.split('@')[0]
    };
    
    console.log('Cleaned form data:', submitData);
    
    setSaving(true);

    try {
      console.log('Submitting form data:', submitData);
      
      // Create FormData for file upload
      const formDataSubmit = new FormData();
      
      // Add all form fields including image
      Object.keys(submitData).forEach(key => {
        const value = submitData[key];
        if (key === 'profileImage' && value && typeof value === 'object') {
          // It's a File object, append it directly
          formDataSubmit.append(key, value);
        } else if (key !== 'profileImage') {
          // Add text fields
          formDataSubmit.append(key, value);
        }
      });
      
      console.log('FormData contents:');
      for (let [key, value] of formDataSubmit.entries()) {
        console.log(`${key}:`, value);
      }
      
      const response = await axios.put('/auth/update-profile', formDataSubmit, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('API Response:', response);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Update local storage with new data from server response
      const updatedUser = response.data?.data?.user || { ...adminUser, ...formData };
      console.log('Updated user from server:', updatedUser);
      console.log('Profile image URL:', updatedUser.profileImage);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setAdminUser(updatedUser);
      setFormData({
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || formData.phone || '', // Use server phone or fallback to form
        profileImage: updatedUser.profileImage || ''
      });
      console.log('Form data after update:', {
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || formData.phone || '',
        profileImage: updatedUser.profileImage || ''
      });
      
      // Manually trigger storage event for cross-tab updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(updatedUser)
      }));
      
      toast.success('Profile updated successfully!');
      setEditMode(false); // Exit edit mode after successful save
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original data
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-3 md:p-5 border border-gray-300 border-b-red-800 border-b-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-4">
            <Cog6ToothIcon className="w-12 md:w-20 h-12 md:h-20 text-red-800 transition-transform duration-300 hover:scale-105 shrink-0" />
            <div className="flex-1">
              <h2 className="text-3xl md:text-6xl font-bold text-gray-900">Admin Profile</h2>
              <div className="flex items-center gap-4">
                <p className="text-xs md:text-sm text-gray-400 mt-2">
                  Manage your personal information and account settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-red-800 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          </div>
          
          <div className="p-8">
            {/* Profile Image Section */}
            <div className="flex items-center gap-8 mb-10">
              <div className="relative">
                {(() => {
                  console.log('Rendering image - formData.profileImage:', formData.profileImage);
                  console.log('Type of profileImage:', typeof formData.profileImage);
                  return formData.profileImage && typeof formData.profileImage === 'object' ? (
                    <img
                      src={URL.createObjectURL(formData.profileImage)}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-red-200"
                    />
                  ) : formData.profileImage && typeof formData.profileImage === 'string' ? (
                    <img
                      src={`${formData.profileImage}?t=${Date.now()}`}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-red-200"
                      onError={(e) => {
                        console.error('Image failed to load:', formData.profileImage);
                        console.error('Error event:', e);
                        // Try to load with different URL format
                        const fallbackUrl = formData.profileImage.replace('http://localhost:5000/uploads', 'http://localhost:5000/api/uploads');
                        console.log('Trying fallback URL:', fallbackUrl);
                        e.target.src = `${fallbackUrl}?t=${Date.now()}`;
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', formData.profileImage);
                      }}
                    />
                  ) : (
                    <UserCircleIcon className="w-32 h-32 text-gray-400 border-4 border-red-200 rounded-full" />
                  );
                })()}
                
                {editMode && (
                  <label className="absolute bottom-0 right-0 bg-red-600 text-white p-3 rounded-full cursor-pointer hover:bg-red-700 transition-colors">
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
                    disabled={!editMode}
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
    </div>
  );
}
