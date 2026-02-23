import React, { useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import QRCode from 'qrcode';
import { API_BASE_URL } from "../../api/config";
import { toast } from 'react-toastify';

export default function AdminCreateK3() {
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
    contact: "",
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
    const password = `WMSU${formData.lrn.slice(-4)}${Math.floor(Math.random() * 1000)}`;
    setFormData({ ...formData, password: password });
    setGeneratedPassword(password);
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!formData.password) {
        alert('Please generate a password first!');
        return;
      }

      const qrData = JSON.stringify({
        lrn: formData.lrn,
        name: `${formData.firstName} ${formData.middleName} ${formData.lastName}`,
        gradeLevel: formData.gradeLevel,
        section: formData.section,
        email: formData.wmsuEmail
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      const studentData = {
        lrn: formData.lrn,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        age: parseInt(formData.age),
        sex: formData.sex,
        gradeLevel: formData.gradeLevel,
        section: formData.section,
        contact: formData.contact,
        wmsuEmail: formData.wmsuEmail,
        password: formData.password,
        profilePic: formData.profilePic || null
      };

      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Student account created successfully!\n\nEmail: ${formData.wmsuEmail}\nPassword: ${formData.password}\n\nPlease save this password!`);
        
        setFormData({
          profilePic: "", lrn: "", firstName: "", middleName: "", lastName: "",
          age: "", sex: "", gradeLevel: "", section: "", contact: "",
          wmsuEmail: "", password: ""
        });
        setGeneratedPassword("");
        setShowPassword(false);
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-lg p-6 border-b-4 border-b-red-800">
        <h2 className="text-4xl font-bold text-gray-900">Create K–3 Student Account</h2>
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
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, profilePic: reader.result });
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
          <input type="text" name="lrn" value={formData.lrn} onChange={handleLRNChange} className="w-full border p-3 rounded-lg" placeholder="e.g., 123456789012" maxLength="12" required />
          <p className="text-xs text-gray-500 mt-1">12-digit unique identifier</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="block font-semibold mb-1">First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
          <div><label className="block font-semibold mb-1">Middle Name</label><input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
          <div><label className="block font-semibold mb-1">Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border p-3 rounded-lg" required /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block font-semibold mb-1">Age</label><input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full border p-3 rounded-lg" min="3" max="12" required /></div>
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
            </select>
          </div>
          <div><label className="block font-semibold mb-1">Section</label>
            <select name="section" value={formData.section} onChange={handleChange} className="w-full border p-3 rounded-lg" required>
              <option value="">Select Section</option>
              {formData.gradeLevel === "Kindergarten" && <option value="Love">Love</option>}
              {formData.gradeLevel === "Grade 1" && <option value="Humility">Humility</option>}
              {formData.gradeLevel === "Grade 2" && <option value="Kindness">Kindness</option>}
              {formData.gradeLevel === "Grade 3" && <> <option value="Diligence">Diligence</option> <option value="Wisdom">Wisdom</option> </>}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">Contact Number (Parent/Guardian)</label>
          <input type="tel" name="contact" value={formData.contact} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="e.g., 09123456789" pattern="[0-9]{11}" required />
          <p className="text-xs text-gray-500 mt-1">11-digit mobile number</p>
        </div>

        <div>
          <label className="block font-semibold mb-1">WMSU Email</label>
          <input type="email" value={formData.wmsuEmail} className="w-full border p-3 rounded-lg bg-gray-100" readOnly />
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
    </div>
  );
}
