import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authService } from "../../api/userService";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await authService.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err?.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center font-montserrat"
      style={{ backgroundImage: "url('/wmsu-bg-se.png')" }}
    >
      <div className="bg-white/95 p-10 rounded-2xl shadow-xl w-[420px] text-center border border-gray-200">
        <img src="/wmsu-logo.jpg" alt="WMSU Logo" className="mx-auto mb-3 w-25 h-25" />
        <div className="flex flex-col mb-6 leading-snug">
          <h2 className="text-gray-800 font-semibold pb-2">Reset Password</h2>
          <p className="text-red-800 font-medium">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              Password updated! Redirecting to login...
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-md transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Updating password...' : 'Update Password'}
          </button>
        </form>

        <div className="flex justify-center text-sm mt-5 text-gray-600">
          <Link to="/login" className="text-red-800 hover:underline font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
