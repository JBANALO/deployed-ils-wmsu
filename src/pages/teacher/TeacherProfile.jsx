import React, { useState, useEffect } from "react";
import { UserCircleIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { authService } from "../../api/userService";
import api from "../../api/axiosConfig";
import { appendSchoolYearId, getTeacherViewingSchoolYearId } from "../../utils/teacherSchoolYear";
import { toast } from 'react-toastify';

export default function TeacherProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(() => getTeacherViewingSchoolYearId());
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "WMSU-ILS Department",
    position: "",
    subjects: "",
    bio: "Dedicated educator with a passion for teaching and student development."
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const viewingSyId = getTeacherViewingSchoolYearId();
        setSelectedSchoolYearId(viewingSyId);

        // First try to get user from localStorage
        let user = null;
        const userStr = localStorage.getItem("user");
        
        if (userStr) {
          try {
            user = JSON.parse(userStr);
            console.log('User from localStorage:', user);
          } catch (e) {
            console.error('Failed to parse user from localStorage:', e);
          }
        }

        // Fetch full user details from API using user ID or email
        if (user && user.id) {
          try {
            console.log('Fetching user details for ID:', user.id);
            const userResponse = await api.get(`/users/${user.id}`);
            if (userResponse.data && userResponse.data.data) {
              const fullUserData = userResponse.data.data;
              console.log('Full user data from API:', fullUserData);
              
              // Update user object with complete data
              user = {
                ...user,
                firstName: fullUserData.firstName || fullUserData.firstname || '',
                lastName: fullUserData.lastName || fullUserData.lastname || '',
                email: fullUserData.email || user.email || '',
                role: fullUserData.role || user.role || ''
              };
              
              // Update localStorage with complete data
              localStorage.setItem('user', JSON.stringify(user));
            }
          } catch (err) {
            console.error('Error fetching full user details:', err);
            console.log('User ID that failed:', user.id);
            // If fetch fails, try to use whatever data we have from localStorage
            console.log('Continuing with localStorage data only');
          }
        }

        if (user) {
          // Set profile data
          setProfileData(prev => ({
            ...prev,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            position: user.role === 'adviser' ? 'Adviser' : user.role === 'subject_teacher' ? 'Subject Teacher' : 'Teacher'
          }));

          // Fetch assigned classes/schedule (ROLE-FILTERED from Railway MySQL)
          if (user.id) {
            try {
              const scheduleData = [];
              
              // Use NEW unified endpoint that returns ONLY classes visible to this teacher
              // based on their role (adviser OR subject teacher)
              try {
                const normalizeId = (value) => (value === null || value === undefined ? "" : String(value).trim());
                const isSameTeacher = (a, b) => normalizeId(a) === normalizeId(b);
                const extractClasses = (response) => {
                  if (Array.isArray(response?.data?.data)) return response.data.data;
                  if (Array.isArray(response?.data)) return response.data;
                  return [];
                };
                const isAdviserNameMatch = (cls) => (
                  user.firstName &&
                  user.lastName &&
                  cls?.adviser_name &&
                  cls.adviser_name.includes(user.firstName) &&
                  cls.adviser_name.includes(user.lastName)
                );
                const dedupeClassesById = (classes = []) => {
                  const map = new Map();
                  classes.forEach((cls) => {
                    if (!cls) return;
                    const key = normalizeId(cls.id) || `${cls.grade || ''}::${cls.section || ''}`;
                    const existing = map.get(key);
                    if (!existing || (Array.isArray(cls.subject_teachers) && cls.subject_teachers.length > 0)) {
                      map.set(key, cls);
                    }
                  });
                  return Array.from(map.values());
                };
                const fetchByLegacyEndpoints = async (schoolYearId) => {
                  const [adviserResp, subjectTeacherResp] = await Promise.all([
                    api.get(appendSchoolYearId(`/classes/adviser/${user.id}`, schoolYearId)),
                    api.get(appendSchoolYearId(`/classes/subject-teacher/${user.id}`, schoolYearId)),
                  ]);

                  const adviserClasses = extractClasses(adviserResp).map((c) => ({ ...c, role_in_class: 'adviser' }));
                  const subjectTeacherClasses = extractClasses(subjectTeacherResp).map((c) => ({ ...c, role_in_class: 'subject_teacher' }));
                  return dedupeClassesById([...adviserClasses, ...subjectTeacherClasses]);
                };

                let visibleClasses = [];

                // 1) Preferred: unified endpoint in selected school year scope.
                try {
                  const visibleClassesResponse = await api.get(appendSchoolYearId(`/classes/teacher/${user.id}`, viewingSyId));
                  visibleClasses = extractClasses(visibleClassesResponse);
                } catch (unifiedErr) {
                  console.error('Unified classes endpoint failed:', unifiedErr);
                }

                // Compatibility fallback for older backend deployments that may not fully populate
                // the unified endpoint yet.
                if (visibleClasses.length === 0) {
                  try {
                    visibleClasses = await fetchByLegacyEndpoints(viewingSyId);
                    console.log(`Fallback class fetch used (scoped). Classes: ${visibleClasses.length}`);
                  } catch (fallbackErr) {
                    console.error('Fallback class fetch failed (scoped):', fallbackErr);
                  }
                }

                // 3) Last fallback: no school-year filter (for stale local storage scope).
                if (visibleClasses.length === 0) {
                  try {
                    visibleClasses = await fetchByLegacyEndpoints('');
                    console.log(`Fallback class fetch used (unscoped). Classes: ${visibleClasses.length}`);
                  } catch (fallbackErr) {
                    console.error('Fallback class fetch failed (unscoped):', fallbackErr);
                  }
                }

                // 4) Adviser name fallback from all classes (handles adviser_id mismatches).
                if (visibleClasses.length === 0 && user.firstName && user.lastName) {
                  try {
                    const allClassesResp = await api.get(appendSchoolYearId('/classes', viewingSyId));
                    const allClasses = extractClasses(allClassesResp);
                    visibleClasses = allClasses
                      .filter((cls) => isAdviserNameMatch(cls))
                      .map((cls) => ({ ...cls, role_in_class: 'adviser' }));
                    console.log(`Name-based adviser fallback used. Classes: ${visibleClasses.length}`);
                  } catch (nameFallbackErr) {
                    console.error('Name-based adviser fallback failed:', nameFallbackErr);
                  }
                }
                
                console.log(`✓ Fetched ${visibleClasses.length} classes for teacher ${user.id}`);
                
                // Convert 24-hour time to 12-hour format
                const convertTime = (time24) => {
                  if (!time24) return '8:00 AM';
                  const [hours, minutes] = time24.split(':');
                  const hour = parseInt(hours);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const hour12 = hour % 12 || 12;
                  return `${hour12}:${minutes} ${ampm}`;
                };
                
                // Process each visible class
                visibleClasses.forEach(cls => {
                  const adviserForClass = cls.role_in_class === 'adviser' || isSameTeacher(cls.adviser_id, user.id) || isAdviserNameMatch(cls);

                  // If user is adviser of this class
                  if (adviserForClass) {
                    scheduleData.push({
                      id: `adviser-${cls.id}`,
                      day: "Monday - Friday",
                      time: "8:00 AM - 3:00 PM",
                      subject: "Advisory Class",
                      gradeSection: `${cls.grade || 'Grade'} - ${cls.section || 'Section'}`
                    });
                  }
                  
                  // If user is subject teacher in this class
                  if ((cls.role_in_class === 'subject_teacher' || cls.subjects_teaching) && Array.isArray(cls.subject_teachers)) {
                    cls.subject_teachers.forEach(st => {
                      if (isSameTeacher(st.teacher_id, user.id)) {
                        scheduleData.push({
                          id: `${cls.id}-${st.subject}`,
                          day: st.day || "Monday - Friday",
                          time: `${convertTime(st.start_time)} - ${convertTime(st.end_time)}`,
                          subject: st.subject || "",
                          gradeSection: `${cls.grade || 'Grade'} - ${cls.section || 'Section'}`
                        });
                      }
                    });
                  }

                  // Fallback: if subject row did not include details array, use summarized subjects list.
                  if (cls.role_in_class === 'subject_teacher' && (!Array.isArray(cls.subject_teachers) || cls.subject_teachers.length === 0) && cls.subjects_teaching) {
                    const subjects = String(cls.subjects_teaching)
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);

                    subjects.forEach((subject, idx) => {
                      scheduleData.push({
                        id: `${cls.id}-fallback-${idx}-${subject}`,
                        day: "Monday - Friday",
                        time: "8:00 AM - 3:00 PM",
                        subject,
                        gradeSection: `${cls.grade || 'Grade'} - ${cls.section || 'Section'}`
                      });
                    });
                  }
                });
                
                // Extract unique subjects for display
                const subjects = [...new Set(scheduleData.map(s => s.subject))].filter(s => s !== 'Advisory Class').join(', ');
                setProfileData(prev => ({
                  ...prev,
                  subjects: subjects || "Advisory Class Only"
                }));
                
                setSchedules(scheduleData);
                console.log('✓ Teacher schedule loaded:', scheduleData);
              } catch (err) {
                console.error('Error fetching teacher visible classes:', err);
                setSchedules([]);
              }
            } catch (err) {
              console.error('Error in class loading:', err);
            }
          }
        } else {
          console.error('No user data found');
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch data immediately on mount
    fetchUserData();
  }, []);

  const [schedules, setSchedules] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (id, field, value) => {
    setSchedules(schedules.map(schedule => 
      schedule.id === id ? { ...schedule, [field]: value } : schedule
    ));
  };

  const addSchedule = () => {
    const newSchedule = {
      id: Date.now(),
      day: "Monday - Friday",
      time: "",
      subject: "",
      gradeSection: ""
    };
    setSchedules([...schedules, newSchedule]);
  };

  const deleteSchedule = (id) => {
    setSchedules(schedules.filter(schedule => schedule.id !== id));
  };

  const handleSave = async () => {
    try {
      // Get user ID from localStorage
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        toast.error("User not found. Please log in again.");
        return;
      }

      const user = JSON.parse(userStr);

      // Update user profile via API using /auth/update-profile
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', profileData.firstName);
      formDataToSend.append('lastName', profileData.lastName);
      formDataToSend.append('username', user.username || user.email);
      formDataToSend.append('email', profileData.email);

      const response = await api.put('/auth/update-profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.status === 'success' || response.status === 200) {
        // Update localStorage with new data
        const updatedUser = {
          ...user,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        toast.success("Profile updated successfully!");
        setIsEditing(false);

        // Refresh data
        window.location.reload();
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Error updating profile: " + (error.response?.data?.message || error.message));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data if needed
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-800 to-red-900 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-full">
              <UserCircleIcon className="w-12 h-12 text-red-800" />
            </div>
            <h2 className="text-4xl font-bold text-white">Teacher Profile</h2>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-white text-red-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition flex items-center gap-2 font-semibold shadow-md"
          >
            <PencilIcon className="w-5 h-5" />
            {isEditing ? "Cancel Edit" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
        <div className="flex items-start gap-8 mb-8">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-40 h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center shadow-lg">
              <UserCircleIcon className="w-32 h-32 text-gray-500" />
            </div>
            {isEditing && (
              <button className="absolute bottom-2 right-2 bg-red-800 text-white p-3 rounded-full hover:bg-red-900 transition shadow-lg">
                <PencilIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-grow">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              {profileData.firstName || profileData.lastName 
                ? `${profileData.firstName} ${profileData.lastName}`.trim()
                : 'Teacher Name'}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-red-100 text-red-800 px-4 py-1 rounded-full text-sm font-semibold">
                {profileData.position}
              </span>
              <span className="text-gray-600 text-sm">{profileData.department}</span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">Email</p>
              <p className="text-gray-900 font-medium">{profileData.email || 'No email available'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">Subject Taught</p>
              <p className="text-gray-900 font-medium">{profileData.subjects}</p>
            </div>
          </div>
        </div>

        {/* Class Schedule */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="bg-red-800 w-1 h-8 rounded"></span>
              Class Schedule
            </h4>
            {!isEditing && selectedSchoolYearId && (
              <span className="text-xs font-semibold bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                School Year Scope: {selectedSchoolYearId}
              </span>
            )}
            {isEditing && (
              <button
                onClick={addSchedule}
                className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition flex items-center gap-2 text-sm font-semibold"
              >
                <PlusIcon className="w-4 h-4" />
                Add Schedule
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
            <table className="w-full border-collapse">
              <thead className="bg-gradient-to-r from-red-800 to-red-900 text-white">
                <tr>
                  <th className="border border-red-700 px-4 py-3 text-left font-semibold">DAY</th>
                  <th className="border border-red-700 px-4 py-3 text-left font-semibold">TIME</th>
                  <th className="border border-red-700 px-4 py-3 text-left font-semibold">SUBJECT</th>
                  <th className="border border-red-700 px-4 py-3 text-left font-semibold">GRADE/SECTION</th>
                  {isEditing && <th className="border border-red-700 px-4 py-3 text-center font-semibold">ACTION</th>}
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 && (
                  <tr className="bg-white">
                    <td
                      className="border border-gray-300 px-4 py-6 text-center text-sm text-gray-500"
                      colSpan={isEditing ? 5 : 4}
                    >
                      No schedule assigned for the current school year scope yet.
                    </td>
                  </tr>
                )}
                {schedules.map((schedule, index) => (
                  <tr key={schedule.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border border-gray-300 px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={schedule.day}
                          onChange={(e) => handleScheduleChange(schedule.id, 'day', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-800 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-800">{schedule.day}</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={schedule.time}
                          onChange={(e) => handleScheduleChange(schedule.id, 'time', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-800 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-800">{schedule.time}</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={schedule.subject}
                          onChange={(e) => handleScheduleChange(schedule.id, 'subject', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-800 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-800">{schedule.subject}</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={schedule.gradeSection}
                          onChange={(e) => handleScheduleChange(schedule.id, 'gradeSection', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-800 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-800">{schedule.gradeSection}</span>
                      )}
                    </td>
                    {isEditing && (
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <TrashIcon className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Profile Information Form - Only show when editing */}
        {isEditing && (
          <div className="border-t-2 border-gray-200 pt-8">
            <h4 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <span className="bg-red-800 w-1 h-8 rounded"></span>
              Edit Profile Information
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={profileData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={profileData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subjects Taught
                </label>
                <input
                  type="text"
                  name="subjects"
                  value={profileData.subjects}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:outline-none shadow-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSave}
                className="bg-red-800 text-white px-8 py-3 rounded-lg hover:bg-red-900 transition font-semibold shadow-md"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-400 transition font-semibold shadow-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}