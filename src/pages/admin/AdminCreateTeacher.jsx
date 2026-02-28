import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import api from "../../api/axiosConfig";
import { toast } from 'react-toastify';

export default function AdminCreateTeacher() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "adviser",
    gradeLevel: "",
    section: "",
    subjects: [],
    kindergartenSubjects: "",
    bio: "",
    profilePic: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Subjects by grade level
  const subjectsByGradeLevel = {
    "Grade 1": ["GMRC", "Reading", "Mathematics", "Makabansa", "Language"],
    "Grade 2": ["GMRC", "Filipino", "Makabansa", "Mathematics", "English"],
    "Grade 3": ["GMRC", "Filipino", "Mathematics", "Makabansa", "English", "Science"],
    "Grade 4": ["GMRC", "English", "ArPan", "Mathematics", "Filipino", "EPP", "Science", "MAPEH"],
    "Grade 5": ["GMRC", "English", "ArPan", "Mathematics", "Filipino", "EPP", "Science", "MAPEH"],
    "Grade 6": ["GMRC", "English", "ArPan", "Mathematics", "Filipino", "EPP", "Science", "MAPEH"],
    "Kindergarten": [] // No specific subjects for kindergarten - will use text input
  };

  // Sections by grade level
  const sectionsByGradeLevel = {
    "Kindergarten": ["Love"],
    "Grade 1": ["Humility"],
    "Grade 2": ["Kindness"],
    "Grade 3": ["Wisdom", "Diligence"],
    "Grade 4": ["Wisdom", "Diligence"], // Same as Grade 3 for now
    "Grade 5": ["Wisdom", "Diligence"], // Same as Grade 3 for now
    "Grade 6": ["Wisdom", "Diligence"], // Same as Grade 3 for now
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
    
    if (name === "gradeLevel") {
      // Clear subjects and section when grade level changes
      setFormData((prev) => ({ 
        ...prev, 
        [name]: value,
        subjects: [], // Reset subjects array
        section: "", // Reset section
        kindergartenSubjects: "" // Reset kindergarten subjects
      }));
    } else if (name === "subjects") {
      // Handle checkbox selection for subjects
      const selectedSubject = value;
      setFormData((prev) => {
        const currentSubjects = prev.subjects || [];
        if (currentSubjects.includes(selectedSubject)) {
          // Remove subject if already selected
          return { ...prev, subjects: currentSubjects.filter(s => s !== selectedSubject) };
        } else {
          // Add subject if not selected
          return { ...prev, subjects: [...currentSubjects, selectedSubject] };
        }
      });
    } else if (name === "kindergartenSubjects") {
      // Handle kindergarten subjects text input
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else if (name === "profilePic" && type === "file") {
      // Handle file upload
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      // Handle regular text inputs
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectAllSubjects = () => {
    if (formData.gradeLevel && formData.gradeLevel !== "Kindergarten" && subjectsByGradeLevel[formData.gradeLevel]) {
      const allSubjects = subjectsByGradeLevel[formData.gradeLevel];
      const currentSubjects = formData.subjects || [];
      
      // Check if all subjects are already selected
      const allSelected = allSubjects.every(subject => currentSubjects.includes(subject));
      
      if (allSelected) {
        // Deselect all subjects
        setFormData(prev => ({ ...prev, subjects: [] }));
      } else {
        // Select all subjects
        setFormData(prev => ({ ...prev, subjects: [...allSubjects] }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Email validation no longer needed since domain is added automatically

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);

      const teacherData = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        gradeLevel: formData.gradeLevel,
        section: formData.section,
        subjects: formData.gradeLevel === "Kindergarten" 
          ? formData.kindergartenSubjects 
          : formData.subjects.join(", "), // Convert array to comma-separated string
        bio: formData.bio,
        profilePic: formData.profilePic,
      };

      const response = await api.post('/teachers/create', teacherData);

      setSuccess("Teacher account created! Go to Admin Approvals to approve the account.");
      
      // Redirect to approvals page after 2 seconds
      setTimeout(() => {
        navigate('/admin/approvals');
      }, 2000);
    } catch (err) {
      toast.error("Registration error: " + (err.message || "Failed to create teacher account."));
      setError(err.message || "Failed to create teacher account.");
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
              <label className="text-sm font-medium text-gray-700">Middle Name</label>
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
            <div className="flex items-center mt-1">
              <input
                type="email"
                name="email"
                value={formData.email.replace('@wmsu.edu.ph', '')}
                onChange={(e) => setFormData({...formData, email: `${e.target.value}@wmsu.edu.ph`})}
                required
                placeholder="Teacher's WMSU Email"
                className="flex-1 p-2.5 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full p-2.5 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`mt-1 w-full p-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 ${
                    formData.password && formData.confirmPassword
                      ? formData.password === formData.confirmPassword
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-red-800"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.password && formData.confirmPassword && (
                <p className={`text-xs mt-1 ${
                  formData.password === formData.confirmPassword
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {formData.password === formData.confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
            >
              <option value="adviser">Adviser</option>
              <option value="subject_teacher">Subject Teacher</option>
            </select>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Grade Level</label>
              <select
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
              >
                <option value="">Select Grade Level</option>
                <option value="Kindergarten">Kindergarten</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Section</label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
              >
                <option value="">Select Section</option>
                {formData.gradeLevel && sectionsByGradeLevel[formData.gradeLevel] ? (
                  sectionsByGradeLevel[formData.gradeLevel].map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Wisdom">Wisdom</option>
                    <option value="Kindness">Kindness</option>
                    <option value="Humility">Humility</option>
                    <option value="Diligence">Diligence</option>
                  </>
                )}
              </select>
              {formData.gradeLevel && (
                <p className="text-xs text-gray-500 mt-1">
                  Sections for {formData.gradeLevel}: {sectionsByGradeLevel[formData.gradeLevel]?.join(", ") || "No specific sections"}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Subjects</label>
            {formData.gradeLevel === "Kindergarten" ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-600 mb-2">
                  Kindergarten subjects (flexible - describe activities/subjects):
                </p>
                <textarea
                  name="kindergartenSubjects"
                  value={formData.kindergartenSubjects}
                  onChange={handleChange}
                  rows="3"
                  placeholder="e.g., Basic Reading, Numbers, Shapes, Colors, Play Activities, Story Time..."
                  className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
                />
                <p className="text-xs text-gray-500">
                  Since Kindergarten students are pre-schoolers, subjects are flexible. We'll confirm with client.
                </p>
              </div>
            ) : formData.gradeLevel && subjectsByGradeLevel[formData.gradeLevel].length > 0 ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    Select subjects for {formData.gradeLevel}:
                  </p>
                  <button
                    type="button"
                    onClick={handleSelectAllSubjects}
                    className="px-3 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
                  >
                    {formData.subjects.length === subjectsByGradeLevel[formData.gradeLevel].length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {subjectsByGradeLevel[formData.gradeLevel].map((subject) => (
                    <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="subjects"
                        value={subject}
                        checked={formData.subjects.includes(subject)}
                        onChange={handleChange}
                        className="w-4 h-4 text-red-800 border-gray-300 rounded focus:ring-red-800"
                      />
                      <span className="text-sm text-gray-700">{subject}</span>
                    </label>
                  ))}
                </div>
                {formData.subjects.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    Selected: {formData.subjects.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">
                  Please select a grade level first to see available subjects
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Works for both Advisers and Subject Teachers - select relevant subjects
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              placeholder="Brief professional biography..."
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Brief description about the teacher</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Profile Picture</label>
            <input
              type="file"
              name="profilePic"
              onChange={handleChange}
              accept="image/*"
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-800"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Upload teacher's profile picture</p>
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
    </div>
  );
}
