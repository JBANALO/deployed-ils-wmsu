 import React, { useState, useEffect } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import QRCode from 'qrcode';
import { API_BASE_URL } from "../../api/config";
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from "../../api/axiosConfig";

export default function AdminCreateK6() {
  const navigate = useNavigate();
  const maxBirthDate = new Date().toISOString().split('T')[0];
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudentEmail, setCreatedStudentEmail] = useState('');
  const [createdStudentPassword, setCreatedStudentPassword] = useState('');
  const [redirectTimer, setRedirectTimer] = useState(null);
  const [sections, setSections] = useState([]);
  const [formData, setFormData] = useState({
    lrn: '',
    firstName: '',
    middleName: '',
    lastName: '',
    username: '', // Add username field
    birthDate: '',
    age: '',
    sex: '',
    gradeLevel: '',
    section: '',
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '@gmail.com',
    parentContact: '',
    wmsuEmail: '',
    password: '',
    profilePic: null,
  });

  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const calculateAgeFromBirthDate = (birthDateValue) => {
    if (!birthDateValue) return '';

    const birthDate = new Date(`${birthDateValue}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 0 ? String(age) : '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'birthDate') {
      const computedAge = calculateAgeFromBirthDate(value);
      setFormData((prev) => ({ ...prev, birthDate: value, age: computedAge }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLRNChange = (e) => {
    const lrn = e.target.value;
    setFormData({ 
      ...formData, 
      lrn: lrn
    });
  };
  
  // Fetch sections on component mount and when grade level changes
  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (formData.gradeLevel) {
      fetchSections();
    }
  }, [formData.gradeLevel]);

  // Listen for section updates from AdminSections
  useEffect(() => {
    const handleSectionUpdate = () => {
      fetchSections();
    };

    window.addEventListener('sectionAdded', handleSectionUpdate);
    return () => {
      window.removeEventListener('sectionAdded', handleSectionUpdate);
    };
  }, []);

  const fetchSections = async () => {
    try {
      const response = await axios.get('/sections');
      setSections(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Update WMSU email and username when first or last name changes
  React.useEffect(() => {
    if (formData.firstName && formData.lastName) {
      const firstName = formData.firstName.toLowerCase().replace(/\s+/g, '');
      const lastName = formData.lastName.toLowerCase().replace(/\s+/g, '');
      const wmsuEmail = `${firstName}.${lastName}@wmsu.edu.ph`;
      const username = `${firstName}.${lastName}`; // Username without domain
      setFormData(prev => ({ ...prev, wmsuEmail, username }));
    }
  }, [formData.firstName, formData.lastName]);

  const generatePassword = () => {
    // Use predictable pattern: WMSU{last4LRN}0000 (consistent with teachers)
    const last4LRN = formData.lrn ? formData.lrn.slice(-4).padStart(4, '0') : '0000';
    const password = `WMSU${last4LRN}0000`;
    setFormData({ ...formData, password: password });
    setGeneratedPassword(password);
    setShowPassword(true);
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    if (!formData.password) {
      toast.error('Please generate a password first!');
      return;
    }

    // Convert profile picture to base64 if it exists
    let profilePicBase64 = null;
    if (formData.profilePic && formData.profilePic instanceof File) {
      profilePicBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(formData.profilePic);
      });
    }

    // ---------------------------
    // Prepare student data
    // ---------------------------
    const studentData = {
      lrn: formData.lrn.trim(),
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim(),
      lastName: formData.lastName.trim(),
      birthDate: formData.birthDate || null,
      age: formData.age,
      sex: formData.sex,
      gradeLevel: formData.gradeLevel,
      section: formData.section,
      parentFirstName: formData.parentFirstName.trim(),
      parentLastName: formData.parentLastName.trim(),
      parentEmail: formData.parentEmail.trim(),
      parentContact: formData.parentContact.trim(),
      studentEmail: formData.wmsuEmail.trim(),
      password: formData.password,
      profilePic: profilePicBase64,
      status: 'approved', // Students are now immediately approved
    };

    // ---------------------------
    // Send to backend
    // ---------------------------
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      'Accept': 'application/json'
      },
      body: JSON.stringify(studentData)
    });

    const result = await response.json();

    if (response.ok) {
      const createdStudent = result.data || result;
      
      // Send parent OTP verification email
      try {
        const otpResponse = await fetch(`${API_BASE_URL}/parent-verification/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            studentId: createdStudent.id || createdStudent.student?.id,
            parentEmail: formData.parentEmail.trim(),
            parentFirstName: formData.parentFirstName.trim(),
            parentLastName: formData.parentLastName.trim(),
            studentName: `${formData.firstName} ${formData.lastName}`
          })
        });

        if (otpResponse.ok) {
          console.log('✅ Parent OTP sent successfully');
        } else {
          const errorData = await otpResponse.json().catch(() => ({}));
          console.error('❌ Failed to send parent OTP:', errorData);
          
          if (errorData.requiresReauth) {
            toast.error('Session expired. Please log out and log in again.');
            // Optionally redirect to login after delay
            setTimeout(() => {
              window.location.href = '/admin/login';
            }, 3000);
          } else {
            toast.warning('Student created! But parent OTP email failed. Please resend manually.');
          }
        }
      } catch (otpError) {
        console.error('Error sending parent OTP:', otpError);
        toast.warning('Student created but parent OTP email failed. Please resend manually.');
      }

      // Success modal
      setCreatedStudentEmail(formData.wmsuEmail);
      setCreatedStudentPassword(formData.password);
      setShowSuccessModal(true);

      // Redirect after 15 seconds
      const timer = setTimeout(() => navigate('/admin/admin-students'), 15000);
      setRedirectTimer(timer);

      // Reset form
      setFormData({
        profilePic: "", lrn: "", firstName: "", middleName: "", lastName: "",
        birthDate: "", age: "", sex: "", gradeLevel: "", section: "", parentFirstName: "",
        parentLastName: "", parentEmail: "", parentContact: "",
        wmsuEmail: "", password: ""
      });
      setProfilePicPreview(null);
      setGeneratedPassword("");
      setShowPassword(false);
    } else {
      toast.error(`Failed: ${result.error}`);
    }
  } catch (error) {
    toast.error('Error: ' + error.message);
  }
};

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-lg p-6 border-b-4 border-b-red-800">
        <h2 className="text-4xl font-bold text-gray-900">Create K–6 Student Account</h2>
        <p className="text-gray-600 mt-2">Admin-only form for generating student accounts and QR codes.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-3xl bg-white p-6 rounded-lg shadow mx-auto space-y-5">
        {/* Profile Picture Upload */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-500 to-purple-600 p-1 shadow-xl">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Student" className="w-full h-full rounded-full object-cover border-4 border-white" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 border-4 border-white flex items-center justify-center">
                  <UserCircleIcon className="w-20 h-20 text-gray-400" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-red-800 text-white p-3 rounded-full cursor-pointer shadow-lg hover:bg-red-700 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    // Create preview URL immediately
                    const previewUrl = URL.createObjectURL(file);
                    setProfilePicPreview(previewUrl);
                    
                    // Optional: resize/compress before storing
                    const img = new Image();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxSize = 300; // max width/height
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                          if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                          }
                        } else {
                          if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                          }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Convert canvas back to Blob
                        canvas.toBlob((blob) => {
                          // Store the File object in formData
                          const resizedFile = new File([blob], file.name, { type: file.type });
                          setFormData({ ...formData, profilePic: resizedFile });
                        }, file.type, 0.7); // 70% quality
                      };
                      img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setProfilePicPreview(null);
                  }
                }}
              />
            </label>
          </div>
          <p className="mt-3 text-sm text-gray-600">Upload Student Photo</p>
        </div>

        {/* Rest of your form — 100% unchanged */}
        <div>
          <label className="block font-semibold mb-1">LRN (Learner Reference Number)</label>
          <input 
            type="text" 
            name="lrn" 
            value={formData.lrn} 
            onChange={handleLRNChange} 
            className="w-full border p-3 rounded-lg" 
            placeholder="e.g., 123456789012" 
            maxLength="12" 
            pattern="[0-9]{12}" 
            inputMode="numeric"
            onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
            required 
          />
          <p className="text-xs text-gray-500 mt-1">12-digit unique identifier (numbers only)</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="block font-semibold mb-1">First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
          <div><label className="block font-semibold mb-1">Middle Name</label><input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="(optional)" /></div>
          <div><label className="block font-semibold mb-1">Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1">Birthday</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg"
              max={maxBirthDate}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Age (Auto)</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              className="w-full border p-3 rounded-lg bg-gray-50"
              min="3"
              max="12"
              step="1"
              readOnly
              required
            />
          </div>
          <div><label className="block font-semibold mb-1">Sex</label>
            <select name="sex" value={formData.sex} onChange={handleChange} className="w-full border p-3 rounded-lg" required>
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block font-semibold mb-1">Grade Level</label>
            <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="w-full border p-3 rounded-lg" required>
              <option value="">Select Grade</option>
              <option value="Kindergarten">Kindergarten</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="NG">Multiple Grade Level (MG)</option>
            </select>
          </div>
          <div><label className="block font-semibold mb-1">Section</label>
            <select name="section" value={formData.section} onChange={handleChange} className="w-full border p-3 rounded-lg" required>
              <option value="">Select Section</option>
              {/* Show dynamically fetched sections that match the selected grade level */}
              {sections
                .filter(section => {
                  if (!formData.gradeLevel) return false;
                  const sectionGrade = section.grade_level || section.grade || '';
                  return sectionGrade === formData.gradeLevel;
                })
                .map(section => (
                  <option key={section.id} value={section.name}>
                    {section.name}
                  </option>
                ))
              }
              {/* Fallback to hardcoded sections if no dynamic sections found */}
              {sections.filter(section => {
                const sectionGrade = section.grade_level || section.grade || '';
                return sectionGrade === formData.gradeLevel;
              }).length === 0 && formData.gradeLevel && (
                <>
                  {formData.gradeLevel === "Kindergarten" && <option value="Love">Love</option>}
                  {formData.gradeLevel === "Grade 1" && <option value="Humility">Humility</option>}
                  {formData.gradeLevel === "Grade 2" && <option value="Kindness">Kindness</option>}
                  {formData.gradeLevel === "Grade 3" && <> <option value="Diligence">Diligence</option> <option value="Wisdom">Wisdom</option> </>}
                  {formData.gradeLevel === "Grade 4" && <> <option value="Prudence">Prudence</option> <option value="Generosity">Generosity</option> </>}
                  {formData.gradeLevel === "Grade 5" && <> <option value="Courage">Courage</option> <option value="Justice">Justice</option> </>}
                  {formData.gradeLevel === "Grade 6" && <> <option value="Honesty">Honesty</option> <option value="Loyalty">Loyalty</option> <option value="Industry">Industry</option></>}
                  {formData.gradeLevel === "NG" && <option value="Responsibility">Responsibility</option>}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Parent/Guardian Information Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Parent First Name</label>
              <input type="text" name="parentFirstName" value={formData.parentFirstName} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="Enter parent first name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">Parent Last Name</label>
              <input type="text" name="parentLastName" value={formData.parentLastName} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="Enter parent last name" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block font-semibold mb-1">Parent Email</label>
              <input 
                type="email" 
                name="parentEmail" 
                value={formData.parentEmail}
                onChange={(e) => {
                  const value = e.target.value;
                  const cursorPos = e.target.selectionStart;
                  
                  if (!value.includes('@gmail.com')) {
                    const newValue = `${value}@gmail.com`;
                    setFormData({...formData, parentEmail: newValue});
                    // Restore cursor position after domain is added
                    setTimeout(() => {
                      e.target.setSelectionRange(cursorPos, cursorPos);
                    }, 0);
                  } else {
                    setFormData({...formData, parentEmail: value});
                  }
                }}
                onFocus={(e) => {
                  const value = e.target.value;
                  if (value === '@gmail.com') {
                    // Clear the field but keep the domain
                    setFormData({...formData, parentEmail: '@gmail.com'});
                    // Position cursor at the beginning
                    setTimeout(() => {
                      // Note: setSelectionRange doesn't work on email inputs
                      // This is a limitation of HTML5 email input type
                    }, 0);
                  } else {
                    // Position cursor before @gmail.com
                    const cursorPos = value.indexOf('@gmail.com');
                    if (cursorPos !== -1) {
                      setTimeout(() => {
                        // Note: setSelectionRange doesn't work on email inputs
                        // This is a limitation of HTML5 email input type
                      }, 0);
                    }
                  }
                }}
                onClick={(e) => {
                  const value = e.target.value;
                  const cursorPos = value.indexOf('@gmail.com');
                  if (cursorPos !== -1) {
                    // Note: setSelectionRange doesn't work on email inputs
                    // This is a limitation of HTML5 email input type
                  }
                }}
                className="w-full border p-3 rounded-lg" 
                placeholder="Parent/Guardian's Personal Gmail" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Parent Contact Number</label>
              <input 
                type="tel" 
                name="parentContact" 
                value={formData.parentContact} 
                onChange={handleChange} 
                className="w-full border p-3 rounded-lg" 
                placeholder="e.g., 09123456789" 
                maxLength="11" 
                pattern="[0-9]{11}" 
                inputMode="numeric"
                onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                required 
              />
              <p className="text-xs text-gray-500 mt-1">11-digit mobile number (numbers only)</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">Username</label>
          <input 
            type="text" 
            name="username" 
            value={formData.username}
            readOnly
            className="w-full border p-3 rounded-lg bg-gray-100 text-gray-600" 
            placeholder="Auto-generated based on name" 
          />
          <p className="text-xs text-gray-500 mt-1">Auto-generated based on first and last name</p>
        </div>

        <div>
          <label className="block font-semibold mb-1">WMSU Email</label>
          <input 
            type="email" 
            name="wmsuEmail" 
            value={formData.wmsuEmail}
            readOnly
            className="w-full border p-3 rounded-lg bg-gray-100 text-gray-600" 
            placeholder="Auto-generated based on LRN" 
          />
          <p className="text-xs text-gray-500 mt-1">Auto-generated based on first and last name</p>
        </div>

        <div>
          <label className="block font-semibold mb-1">Password</label>
          <div className="flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="flex-1 border p-3 rounded-lg"
              placeholder="Click 'Generate Password'"
              required
            />
            <button
              type="button"
              onClick={generatePassword}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Password
            </button>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {generatedPassword && (
            <p className="text-sm text-green-600 mt-2 font-semibold">
              Password generated: {generatedPassword}
            </p>
          )}
        </div>

        <button type="submit" className="w-full bg-red-800 text-white py-3 rounded-lg hover:bg-red-700 font-semibold text-lg">
          Create Account + Generate QR Code
        </button>
      </form>
            {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Account Created Successfully!</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Email:</span> {createdStudentEmail}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdStudentEmail);
                      toast.success('Email copied to clipboard!');
                    }}
                    className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300 transition-colors"
                  >
                    Copy
                  </button>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Password:</span> {createdStudentPassword}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdStudentPassword);
                      toast.success('Password copied to clipboard!');
                    }}
                    className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300 transition-colors"
                  >
                    Copy
                  </button>
                </p>
              </div>
              <p className="text-sm text-red-600 font-semibold mb-4">
                ⚠️ Please save this password! It will not be shown again.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Redirecting to Admin Students in 15 seconds...
              </p>
              <button
                onClick={() => {
                  // Clear the redirect timer if user closes modal manually
                  if (redirectTimer) {
                    clearTimeout(redirectTimer);
                    setRedirectTimer(null);
                  }
                  setShowSuccessModal(false);
                  navigate('/admin/admin-students');
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Go to Admin Students Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
