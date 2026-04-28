import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const ParentVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");

  // Get student info from URL params
  const studentId = searchParams.get('studentId');
  const studentName = searchParams.get('studentName') || 'Student';
  const parentEmail = searchParams.get('parentEmail') || 'Parent';

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setIsVerifying(true);

    try {
      console.log('🔍 Sending verification request:', { studentId, otp });
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://deployed-ils-wmsu-production.up.railway.app/api'}/parent-verification/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId,
          otp: otp
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerified(true);
        toast.success('Parent verification successful!');
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError(err.message || "Failed to verify OTP. Please try again.");
    } finally {
      setIsVerifying(false);
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
          Parent Email Verification
        </h2>

        {!isVerified ? (
          <>
            <div className="flex flex-col mb-6 leading-snug">
              <h2 className="text-gray-800 font-semibold pb-2">Enter Verification Code</h2>
              <p className="text-red-800 font-medium">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium mb-2 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 text-left">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black-500"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className={`w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-md transition ${isVerifying ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-gray-800 font-semibold mb-2 text-green-600">Verification Successful!</h2>
            <p className="text-green-800 font-medium mb-4">
              Thank you! Your parent account for <span className="font-medium">{studentName}</span> has been successfully verified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentVerifyPage;
