import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ChevronDownIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import api from "../../api/axiosConfig";
import { UserContext } from "../../context/UserContext";

export default function TeacherTopbar({ sidebarOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingPasswordVerification, setIsSendingPasswordVerification] = useState(false);
  const [passwordVerificationSent, setPasswordVerificationSent] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    newEmail: "",
    confirmEmail: "",
    verificationCode: "",
  });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { logout } = useContext(UserContext);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const fullName = `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || user.name || user.email || "User";
        setUserName(fullName);
      }
    } catch (error) {
      console.error("Failed to read user from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the user menu button itself
      const target = event.target;
      const isUserMenuButton = target.closest('[aria-label="User menu"]');
      
      if (isUserMenuButton) {
        return;
      }
      
      // Close user dropdown if clicking outside
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    // Use UserContext logout to clear user data properly
    logout();
    
    // Clear authentication tokens
    localStorage.removeItem('token');
    localStorage.removeItem('lastAdminEmail');
    localStorage.removeItem('lastTeacherEmail');
    localStorage.removeItem('lastStudentEmail');
    
    // Navigate to login
    navigate("/login");
  };
  const handleMainDashboard = () => navigate("/teacher/teacher-dashboard");
  const handleProfile = () => navigate("/teacher/teacher-profile");
  const handleGradesPortal = () => navigate("/edit-grades");
  const handleAttendancePage = () => navigate("/qr-portal");
  const handleChangePassword = () => {
    setShowDropdown(false);
    setShowPasswordModal(true);
  };

  const handleChangeEmail = () => {
    setShowDropdown(false);
    setShowEmailModal(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!passwordVerificationSent) {
      setErrorMessage('Please send verification first');
      setShowErrorModal(true);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      setShowErrorModal(true);
      return;
    }

    if (!passwordData.verificationCode) {
      setErrorMessage('Please enter the verification code');
      setShowErrorModal(true);
      return;
    }

    // Get current user email from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setErrorMessage('User not found. Please log in again.');
      setShowErrorModal(true);
      return;
    }

    const user = JSON.parse(userStr);
    const email = user.email || user.student_email;

    if (!email) {
      setErrorMessage('Email not found in your profile.');
      setShowErrorModal(true);
      return;
    }

    setIsChangingPassword(true);
    try {
      // Verify the code first
      const verifyResponse = await api.post('/auth/verify-code', {
        email,
        code: passwordData.verificationCode
      });

      if (verifyResponse.data.message !== 'Verification successful') {
        setErrorMessage(verifyResponse.data.message || 'Invalid or expired verification code');
        setShowErrorModal(true);
        return;
      }

      // Change password
      await api.put('/auth/change-password', {
        newPassword: passwordData.newPassword
      });

      setErrorMessage('Password changed successfully!');
      setShowErrorModal(true);
      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '', verificationCode: '' });
      setPasswordVerificationSent(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to change password');
      setShowErrorModal(true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendPasswordVerification = async () => {
    // Get current user email from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setErrorMessage('User not found. Please log in again.');
      setShowErrorModal(true);
      return;
    }

    const user = JSON.parse(userStr);
    const email = user.email || user.student_email;

    if (!email) {
      setErrorMessage('Email not found in your profile.');
      setShowErrorModal(true);
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      setErrorMessage('Please enter a new password (at least 8 characters)');
      setShowErrorModal(true);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return;
    }

    setIsSendingPasswordVerification(true);
    try {
      await api.post('/auth/send-verification', {
        email
      });
      setErrorMessage('Verification email sent successfully!');
      setShowErrorModal(true);
      setPasswordVerificationSent(true);
    } catch (error) {
      console.error('Error sending verification:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to send verification email');
      setShowErrorModal(true);
    } finally {
      setIsSendingPasswordVerification(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();

    if (!verificationSent) {
      setErrorMessage('Please send verification first');
      setShowErrorModal(true);
      return;
    }

    if (emailData.newEmail !== emailData.confirmEmail) {
      setErrorMessage('Emails do not match');
      setShowErrorModal(true);
      return;
    }

    if (!emailData.newEmail || !emailData.newEmail.endsWith('@wmsu.edu.ph')) {
      setErrorMessage('Invalid email');
      setShowErrorModal(true);
      return;
    }

    if (!emailData.verificationCode) {
      setErrorMessage('Please enter the verification code');
      setShowErrorModal(true);
      return;
    }

    // Verify the code first
    try {
      const verifyResponse = await api.post('/auth/verify-code', {
        email: emailData.newEmail,
        code: emailData.verificationCode
      });

      if (verifyResponse.data.message !== 'Verification successful') {
        setErrorMessage(verifyResponse.data.message || 'Invalid or expired verification code');
        setShowErrorModal(true);
        return;
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setErrorMessage(error.response?.data?.message || 'Invalid or expired verification code');
      setShowErrorModal(true);
      return;
    }

    setIsChangingEmail(true);
    try {
      // Get current user data from localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        
        // Send all required fields along with new email
        await api.put('/auth/update-profile', {
          firstName: user.firstName || user.first_name || '',
          lastName: user.lastName || user.last_name || '',
          username: user.username || '',
          email: emailData.newEmail
        });

        // Update localStorage with new email
        user.email = emailData.newEmail;
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error('User not found in localStorage');
      }

      setErrorMessage('Email changed successfully!');
      setShowErrorModal(true);
      setShowEmailModal(false);
      setEmailData({ newEmail: '', confirmEmail: '', verificationCode: '' });
      setVerificationSent(false);
    } catch (error) {
      console.error('Error changing email:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to change email');
      setShowErrorModal(true);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSendVerification = async () => {
    if (!emailData.newEmail || !emailData.newEmail.endsWith('@wmsu.edu.ph')) {
      setErrorMessage('Invalid email');
      setShowErrorModal(true);
      return;
    }

    setIsSendingVerification(true);
    try {
      await api.post('/auth/send-verification', {
        email: emailData.newEmail
      });
      setErrorMessage('Verification email sent successfully!');
      setShowErrorModal(true);
      setVerificationSent(true);
    } catch (error) {
      console.error('Error sending verification:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to send verification email');
      setShowErrorModal(true);
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-16 bg-white shadow flex items-center justify-between px-8 border-b border-gray-200 z-20 transition-all duration-500 ease-in-out ${
          sidebarOpen ? "left-64" : "left-20"
        }`}
      >
        <div className="flex items-center">
          <img
            src="/wmsu-logo.jpg"
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover"
          />
          <h1 className="text-sm font-semibold leading-tight pl-3">
            WMSU ILS - Elementary Department
          </h1>
        </div>

        <div className="flex items-center gap-6 relative">
          {/* User Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="User menu"
            >
              <UserCircleIcon className="w-8 h-8 text-red-800" />
              <ChevronDownIcon className={`w-4 h-4 text-red-800 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-56 text-sm z-10 animate-fadeIn">
                <div className="px-4 py-2 border-b font-semibold">
                  {userName || "Loading..."}
                </div>
                <ul>
                  <li
                    onClick={handleMainDashboard}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Dashboard
                  </li>
                  <li
                    onClick={handleProfile}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Profile
                  </li>
                  <li
                    onClick={handleChangePassword}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Change Account Password
                  </li>
                  <li
                    onClick={handleChangeEmail}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Change Email
                  </li>
                  <li
                    onClick={handleGradesPortal}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Edit Grades
                  </li>
                  <li
                    onClick={handleAttendancePage}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    QR Code Portal
                  </li>
                  <hr />
                  <li
                    onClick={handleLogout}
                    className="px-4 py-2 text-red-800 hover:bg-gray-100 cursor-pointer"
                  >
                    Log Out
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Account Password</h2>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, newPassword: e.target.value});
                        setPasswordVerificationSent(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 pr-10"
                      required
                      placeholder="Enter new password (min 8 characters)"
                      minLength="8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 pr-10"
                      required
                      placeholder="Confirm new password"
                      minLength="8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {passwordVerificationSent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                    <input
                      type="text"
                      value={passwordData.verificationCode}
                      onChange={(e) => setPasswordData({...passwordData, verificationCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                      placeholder="Enter 6-digit code"
                      maxLength="6"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
                  </div>
                )}

                {passwordVerificationSent && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">✓ Verification email sent. Please check your inbox and enter the code above.</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSendPasswordVerification}
                    disabled={isSendingPasswordVerification || passwordVerificationSent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSendingPasswordVerification ? "Sending..." : passwordVerificationSent ? "Verification Sent" : "Send Verification"}
                  </button>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPasswordData({ newPassword: '', confirmPassword: '', verificationCode: '' });
                        setPasswordVerificationSent(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isChangingPassword || !passwordVerificationSent}
                      className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isChangingPassword ? "Changing..." : "Save"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Email</h2>

              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Email</label>
                  <input
                    type="email"
                    value={emailData.newEmail}
                    onChange={(e) => {
                      setEmailData({...emailData, newEmail: e.target.value});
                      setVerificationSent(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    required
                    placeholder="Enter new email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Email</label>
                  <input
                    type="email"
                    value={emailData.confirmEmail}
                    onChange={(e) => setEmailData({...emailData, confirmEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    required
                    placeholder="Confirm new email"
                  />
                </div>

                {verificationSent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                    <input
                      type="text"
                      value={emailData.verificationCode}
                      onChange={(e) => setEmailData({...emailData, verificationCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                      placeholder="Enter 6-digit code"
                      maxLength="6"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
                  </div>
                )}

                {verificationSent && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">✓ Verification email sent. Please check your inbox and enter the code above.</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={isSendingVerification || verificationSent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSendingVerification ? "Sending..." : verificationSent ? "Verification Sent" : "Send Verification"}
                  </button>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailModal(false);
                        setEmailData({ newEmail: '', confirmEmail: '' });
                        setVerificationSent(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isChangingEmail || !verificationSent}
                      className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isChangingEmail ? "Changing..." : "Save"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Message</h2>
              <p className="text-gray-700 mb-6">{errorMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}