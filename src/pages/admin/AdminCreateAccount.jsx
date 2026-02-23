import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { authService } from "../../api/userService";
import { toast } from 'react-toastify';

export default function AdminCreateAccount() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin"
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate email domain
    if (!formData.email.endsWith("@wmsu.edu.ph")) {
      setError("Please use an official WMSU email address ending in @wmsu.edu.ph");
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email) {
      setError("All fields are required.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare admin account data
      const adminData = {
        ...formData,
        role: "admin"
      };

      // Call registration API
      const response = await authService.register(adminData);
      
      setSuccess(
        "✅ Admin account created successfully!\n" +
        "The account has been auto-approved.\n" +
        "You can now login with the new credentials.\n" +
        "Redirecting to login page..."
      );
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      
    } catch (err) {
      toast.error("Admin account creation error: " + (err.message || "Failed to create admin account. Please try again."));
      setError(err.message || "Failed to create admin account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 font-montserrat"
      style={{
        background: `linear-gradient(to bottom, #800000 30%, #D3D3D3 50%, #ffffff 100%)`,
      }}
    >
      <div className="bg-white border border-gray-300 rounded-md shadow-lg w-[740px] p-10 text-center">
        <div className="flex flex-row gap-6 items-center mb-6">
          <img
            src="/wmsu-logo.jpg"
            alt="WMSU Logo"
            className="w-25 h-25 rounded-full object-cover mb-2"
          />
          <h2 className="text-[15px] text-red-800 font-bold leading-snug">
            WMSU ILS-Elementary Department: <br />
            Admin Account Creation Portal
          </h2>
        </div>

        <hr className="border-gray-400 mb-8" />

        <h3 className="text-xl font-semibold text-gray-800 mb-6">
          Create New Admin Account
        </h3>

        {error && (
          <div className="text-red-700 mb-3 font-medium text-sm bg-red-50 px-4 py-3 rounded-md border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-green-700 mb-3 font-medium text-sm bg-green-50 px-4 py-3 rounded-md border border-green-200 whitespace-pre-line">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left mx-auto max-w-[600px]">
          <div>
            <label className="text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-800"
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
              className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@wmsu.edu.ph"
              className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-800"
            />
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              className="w-full mt-1 p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-800"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[42px] text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength="6"
              className="w-full mt-1 p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-800"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[42px] text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Admin accounts will be automatically approved upon creation.
              Only use official WMSU email addresses (@wmsu.edu.ph).
            </p>
          </div>

          <hr className="border-gray-400 mt-8 mb-5" />

          <div className="flex justify-center space-x-3 mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-900 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-800 focus:ring-opacity-50 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Creating Admin Account...' : 'Create Admin Account'}
            </button>
            <button
              type="button"
              className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2.5 px-6 rounded-md"
              onClick={() => navigate("/admin/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
