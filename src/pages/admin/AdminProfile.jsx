import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, CameraIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import { UserContext } from "../../context/UserContext";

const API_BASE = import.meta.env.VITE_API_URL;

export default function AdminProfile() {
  const { adminUser, updateUser } = useContext(UserContext);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: adminUser?.firstName || '',
    lastName: adminUser?.lastName || '',
    username: adminUser?.username || '',
    email: adminUser?.email || '',
    phone: adminUser?.phone || '',
    profileImage: adminUser?.profileImage || ''
  });

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, profileImage: file }));
      toast.success('Image selected! Click "Save Changes" to upload.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const submitData = { ...formData, username: formData.username || formData.email.split('@')[0] };
    setSaving(true);

    try {
      const formDataSubmit = new FormData();
      Object.keys(submitData).forEach(key => {
        const value = submitData[key];
        if (key === 'profileImage' && value && typeof value === 'object') {
          formDataSubmit.append(key, value);
        } else if (key !== 'profileImage') {
          formDataSubmit.append(key, value);
        }
      });

      const response = await axios.put('/auth/update-profile', formDataSubmit, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedUser = response.data?.data?.user || { ...adminUser, ...formData };
      updateUser(updatedUser);

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
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Error updating profile');
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
    setEditMode(false);
  };

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-3 md:p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-4">
          <Cog6ToothIcon className="w-12 md:w-20 h-12 md:h-20 text-red-800 transition-transform duration-300 hover:scale-105 shrink-0" />
          <div className="flex-1">
            <h2 className="text-3xl md:text-6xl font-bold text-gray-900">Admin Profile</h2>
            <p className="text-xs md:text-sm text-gray-400 mt-2">
              Manage your personal information and account settings
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-red-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Personal Information</h2>
        </div>

        <div className="p-8">
          {/* Profile Image */}
          <div className="flex items-center gap-8 mb-10">
            <div className="relative">
              {formData.profileImage && typeof formData.profileImage === 'object' ? (
                <img
                  src={URL.createObjectURL(formData.profileImage)}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-red-200"
                />
              ) : formData.profileImage && typeof formData.profileImage === 'string' ? (
                <img
                  src={formData.profileImage.startsWith('http') ? formData.profileImage : `${API_BASE}${formData.profileImage}`}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-red-200"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                />
              ) : (
                <UserCircleIcon className="w-32 h-32 text-gray-400 border-4 border-red-200 rounded-full" />
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
