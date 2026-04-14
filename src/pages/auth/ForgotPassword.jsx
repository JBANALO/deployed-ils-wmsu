import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../api/userService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center font-montserrat"
      style={{ backgroundImage: "url('/wmsu-bg-se.png')" }}
    >
      <div className="bg-white/95 p-10 rounded-2xl shadow-xl w-[420px] h-auto text-center border border-gray-200">
        <img
          src="/wmsu-logo.jpg"
          alt="WMSU Logo"
          className="mx-auto mb-3 w-25 h-25"
        />

        <h2 className="text-sm text-red-800 font-bold mb-4 leading-snug">
          WMSU ILS-Elementary Department:
          <br />
          Automated Grades Portal and Students Attendance using QR Code
        </h2>

        {!submitted ? (
          <>
            <div className="flex flex-col mb-6 leading-snug">
              <h2 className="text-gray-800 font-semibold pb-2">Forgot Password?</h2>
              <p className="text-red-800 font-medium">
                Enter your email to reset password
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium mb-2 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@wmsu.edu.ph"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-md transition ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="flex justify-center text-sm mt-5 text-gray-600">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-[150px] bg-gray-600 hover:bg-gray-400 text-white font-semibold py-4 px-6 rounded-md transition duration-200 transform hover:scale-105"
              >
                Login
              </button>
            </div>
          </>
        ) : error ? (
          <div className="space-y-4">
            <h2 className="text-gray-800 font-semibold mb-2 text-red-600">Error!</h2>
            <p className="text-red-800 font-medium mb-4">
              {error}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-gray-800 font-semibold mb-2">Success!</h2>
            <p className="text-red-800 font-medium mb-4">
              A password reset link has been sent to <br />
              <span className="font-medium">{email}</span>
            </p>

            <button
              onClick={() => window.location.href = '/login'}
              className="w-full inline-block bg-gray-400 hover:bg-gray-500 text-white font-semibold py-4 px-6 rounded-md transition text-center"
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
