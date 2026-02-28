 import React, { useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import QRCode from 'qrcode';
import { API_BASE_URL } from "../../api/config";
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateK6() {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudentEmail, setCreatedStudentEmail] = useState('');
  const [createdStudentPassword, setCreatedStudentPassword] = useState('');
  const [formData, setFormData] = useState({
    profilePic: "",
    lrn: "",
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    sex: "",
    gradeLevel: "",
    section: "",
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentContact: "",
    wmsuEmail: "",
    password: "",
  });

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLRNChange = (e) => {
    const lrn = e.target.value;
    setFormData({ 
      ...formData, 
      lrn: lrn,
      wmsuEmail: lrn ? `${lrn}@wmsu.edu.ph` : ""
    });
  };

  const generatePassword = () => {
    const password = `WMSU${formData.lrn.slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
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

    // ---------------------------
    // Prepare FormData
    // ---------------------------
    const fd = new FormData();
    fd.append('lrn', formData.lrn.trim());
    fd.append('firstName', formData.firstName.trim());
    fd.append('middleName', formData.middleName.trim());
    fd.append('lastName', formData.lastName.trim());
    fd.append('age', formData.age);
    fd.append('sex', formData.sex);
    fd.append('gradeLevel', formData.gradeLevel);
    fd.append('section', formData.section);
    fd.append('parentFirstName', formData.parentFirstName.trim());
    fd.append('parentLastName', formData.parentLastName.trim());
    fd.append('parentEmail', formData.parentEmail.trim());
    fd.append('parentContact', formData.parentContact.trim());
    fd.append('studentEmail', formData.wmsuEmail.trim());
    fd.append('password', formData.password);

    // Append profile picture file if available
    if (formData.profilePic) {
      fd.append('profilePic', formData.profilePic);
    }

    // ---------------------------
    // Send to backend
    // ---------------------------
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      body: fd, // <-- FormData automatically sets multipart/form-data
    });

    const result = await response.json();

    if (response.ok) {
      // Success modal
      setCreatedStudentEmail(formData.wmsuEmail);
      setCreatedStudentPassword(formData.password);
      setShowSuccessModal(true);

      // Redirect after 15 seconds
      setTimeout(() => navigate('/admin/approvals'), 15000);

      // Reset form
      setFormData({
        profilePic: "", lrn: "", firstName: "", middleName: "", lastName: "",
        age: "", sex: "", gradeLevel: "", section: "", parentFirstName: "",
        parentLastName: "", parentEmail: "", parentContact: "",
        wmsuEmail: "", password: ""
      });
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
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-xl">
              {formData.profilePic ? (
                <img src={formData.profilePic} alt="Student" className="w-full h-full rounded-full object-cover border-4 border-white" />
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
          <div><label className="block font-semibold mb-1">Middle Name</label><input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
          <div><label className="block font-semibold mb-1">Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block font-semibold mb-1">Age</label><input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full border p-3 rounded-lg" min="3" max="12" step="1" required /></div>
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
            </select>
          </div>
          <div><label className="block font-semibold mb-1">Section</label>
            <select name="section" value={formData.section} onChange={handleChange} className="w-full border p-3 rounded-lg" required>
              <option value="">Select Section</option>
              {formData.gradeLevel === "Kindergarten" && <option value="Love">Love</option>}
              {formData.gradeLevel === "Grade 1" && <option value="Humility">Humility</option>}
              {formData.gradeLevel === "Grade 2" && <option value="Kindness">Kindness</option>}
              {formData.gradeLevel === "Grade 3" && <> <option value="Diligence">Diligence</option> <option value="Wisdom">Wisdom</option> </>}
              {formData.gradeLevel === "Grade 4" && <> <option value="Courage">Courage</option> <option value="Honesty">Honesty</option> </>}
              {formData.gradeLevel === "Grade 5" && <> <option value="Respect">Respect</option> <option value="Responsibility">Responsibility</option> </>}
              {formData.gradeLevel === "Grade 6" && <> <option value="Leadership">Leadership</option> <option value="Excellence">Excellence</option> </>}
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
              <div className="flex items-center">
                <input 
                  type="email" 
                  name="parentEmail" 
                  value={formData.parentEmail.replace('@gmail.com', '')} 
                  onChange={(e) => setFormData({...formData, parentEmail: `${e.target.value}@gmail.com`})}
                  className="flex-1 border p-3 rounded-l-lg" 
                  placeholder="Parent/Guardian's Personal Gmail" 
                  required 
                />
                <span className="border border-l-0 p-3 rounded-r-lg bg-gray-100 text-gray-600">@gmail.com</span>
              </div>
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
          <label className="block font-semibold mb-1">WMSU Email</label>
          <div className="flex items-center">
            <input 
              type="email" 
              value={formData.wmsuEmail.replace('@wmsu.edu.ph', '')} 
              onChange={(e) => setFormData({...formData, wmsuEmail: `${e.target.value}@wmsu.edu.ph`})}
              className="flex-1 border p-3 rounded-l-lg" 
              placeholder="wmsu_email" 
              required 
            />
            <span className="border border-l-0 p-3 rounded-r-lg bg-gray-100 text-gray-600">@wmsu.edu.ph</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Auto-generated based on LRN</p>
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
                    onClick={() => navigator.clipboard.writeText(createdStudentEmail)}
                    className="ml-2 text-blue-600 underline text-xs"
                  >
                    Copy
                  </button>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Password:</span> {createdStudentPassword}
                  <button
                    onClick={() => navigator.clipboard.writeText(createdStudentPassword)}
                    className="ml-2 text-blue-600 underline text-xs"
                  >
                    Copy
                  </button>
                </p>
              </div>
              <p className="text-sm text-red-600 font-semibold mb-4">
                ⚠️ Please save this password! It will not be shown again.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Redirecting to Admin Approvals in 15 seconds...
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/admin/approvals');
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Go to Admin Approvals Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
