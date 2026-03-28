import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosConfig";
import { toast } from 'react-toastify';
import { generateWmsuPassword } from "../../utils/passwordGenerator";

export default function AdminCreateTeacher() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    username: "",
    email: "@wmsu.edu.ph",
    password: "", // Start empty
    bio: "",
    profilePic: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState(null);
  const navigate = useNavigate();

  // Generate password function (based on email like students)
  const generatePassword = () => {
    const password = generateWmsuPassword(formData);
    setFormData(prev => ({ 
      ...prev, 
      password: password
    }));
  };



  // Auto-generate username based on first name
  useEffect(() => {
    if (formData.firstName) {
      const generatedUsername = formData.firstName.toLowerCase().replace(/\s+/g, '');
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [formData.firstName]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (name === "profilePic" && type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = String(formData.email || '').trim().toLowerCase();
    const emailPrefix = normalizedEmail.replace('@wmsu.edu.ph', '').trim();

    if (!normalizedEmail.endsWith('@wmsu.edu.ph') || !emailPrefix) {
      setError('Please enter a valid teacher email before @wmsu.edu.ph');
      return;
    }

    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert profile picture to base64 if it exists
      let profilePicBase64 = null;
      if (formData.profilePic && formData.profilePic instanceof File) {
        profilePicBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(formData.profilePic);
        });
      }

      const teacherData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName,
        lastName: formData.lastName.trim(),
        username: formData.username,
        email: normalizedEmail,
        password: formData.password,
        role: 'teacher',
        bio: formData.bio || '',
        profilePic: profilePicBase64,
        status: 'approved',
      };

      const response = await api.post('/teachers', teacherData);

      console.log('🎯 Teacher creation response:', response.data);
      console.log('🎯 Teacher created with status:', teacherData.status);
      console.log('🎯 Teacher role selected:', teacherData.role);
      console.log('🎯 Full teacher data sent:', teacherData);

      // Show success modal instead of toast
      setShowSuccessModal(true);
      
      // Redirect quickly to teacher list so new account appears immediately.
      const timer = setTimeout(() => {
        console.log('🔄 Redirecting to admin/admin-teachers...');
        navigate('/admin/admin-teachers', { state: { refreshTeachers: true } });
      }, 1500);
      setRedirectTimer(timer);
      
      // Also add immediate redirect as backup
      console.log('✅ Teacher created successfully, should redirect to teachers displayed accounts in 15 seconds');
      
      // Add safeguard redirect in case modal is closed immediately
      setTimeout(() => {
        console.log('🔄 Safeguard redirect check - should be at admin-teachers page');
        if (window.location.pathname !== '/admin/admin-teachers') {
          console.log('🚨 Not at admin-teachers page, forcing redirect...');
          navigate('/admin/admin-teachers', { state: { refreshTeachers: true } });
        }
      }, 2500); // 1 second after main redirect
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to create teacher account.";
      toast.error("Registration error: " + msg);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-montserrat">
      <div className="max-w-3xl mx-auto py-10 px-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Teacher Account</h1>

        {error && (
          <p className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm font-medium">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 px-4 py-2 rounded-md bg-green-50 text-green-700 border border-green-200 text-sm font-medium">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Username (Auto-generated)</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              readOnly
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-800"
            />
            <p className="text-xs text-gray-500 mt-1">Username is automatically generated from first name</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email (@wmsu.edu.ph)</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={(e) => {
                const value = e.target.value;
                const cursorPos = e.target.selectionStart;
                
                if (!value.includes('@wmsu.edu.ph')) {
                  const newValue = `${value}@wmsu.edu.ph`;
                  setFormData({...formData, email: newValue});
                  // Restore cursor position after domain is added
                  setTimeout(() => {
                    e.target.setSelectionRange(cursorPos, cursorPos);
                  }, 0);
                } else {
                  setFormData({...formData, email: value});
                }
              }}
              onFocus={(e) => {
                const value = e.target.value;
                if (value === '@wmsu.edu.ph') {
                  // Position cursor at the beginning
                  setTimeout(() => {
                    e.target.setSelectionRange(0, 0);
                  }, 0);
                } else {
                  // Position cursor before @wmsu.edu.ph
                  const cursorPos = value.indexOf('@wmsu.edu.ph');
                  if (cursorPos !== -1) {
                    setTimeout(() => {
                      e.target.setSelectionRange(cursorPos, cursorPos);
                    }, 0);
                  }
                }
              }}
              onClick={(e) => {
                const value = e.target.value;
                const cursorPos = value.indexOf('@wmsu.edu.ph');
                if (cursorPos !== -1) {
                  e.target.setSelectionRange(cursorPos, cursorPos);
                }
              }}
              required
              placeholder="Teacher's WMSU Email"
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Click 'Generate Password' to create password based on email"
                  readOnly
                  className="flex-1 p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  disabled={!formData.email || !formData.email.includes('@wmsu.edu.ph')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Generate Password
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Generate password based on WMSU email (requires valid email first)
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Role, Grade Level, Section, and Subjects will be assigned later via the <strong>Assign Adviser</strong> page.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-md text-white font-semibold bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-800 focus:ring-offset-1 ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Creating..." : "Create Teacher"}
            </button>
          </div>
        </form>
      </div>
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Teacher Account Created Successfully!</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Email:</span> {formData.email}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(formData.email);
                      toast.success('Email copied to clipboard!');
                    }}
                    className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300 transition-colors"
                  >
                    Copy
                  </button>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Password:</span> {formData.password}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(formData.password);
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
                Redirecting to Admin Teachers...
              </p>
              <button
                onClick={() => {
                  // Clear the redirect timer if user closes modal manually
                  if (redirectTimer) {
                    clearTimeout(redirectTimer);
                    setRedirectTimer(null);
                  }
                  setShowSuccessModal(false);
                  navigate('/admin/admin-teachers', { state: { refreshTeachers: true } });
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Go to Teachers Display Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
