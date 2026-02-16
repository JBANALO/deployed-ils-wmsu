import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Password reset requested for:", email);
    setSubmitted(true); 
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

        {!submitted ? (
          <>
            <div className="flex flex-col mb-6 leading-snug">
              <h2 className="text-gray-800 font-semibold pb-2">Forgot Password?</h2>
              <p className="text-red-800 font-medium">
                Enter your email to reset password
              </p>
            </div>

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
                className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-2.5 rounded-md transition"
              >
                Send Reset Link
              </button>
            </form>

            <div className="flex justify-between text-sm mt-5 text-gray-600">
              <Link to="/login" className="hover:text-gray-800">
                Login
              </Link>
              <Link to="/create-account" className="hover:text-gray-800">
                Create an Account
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-gray-800 font-semibold mb-2">Success!</h2>
            <p className="text-red-800 font-medium mb-4">
              A password reset link has been sent to <br />
              <span className="font-medium">{email}</span>
            </p>

            <Link
              to="/login"
              className="w-full inline-block bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2.5 rounded-md transition text-center"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
