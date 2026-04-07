import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function OTPVerification({ 
  email, 
  teacherName, 
  onVerificationSuccess, 
  onResendOTP,
  onCancel,
  isSubmitting = false 
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = pastedData.split('').slice(0, 6);
    setOtp(newOtp);
    
    // Focus last filled input
    const lastIndex = newOtp.length - 1;
    if (lastIndex >= 0) {
      const lastInput = document.getElementById(`otp-${lastIndex}`);
      if (lastInput) lastInput.focus();
    }
  };

  const handleSubmit = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    onVerificationSuccess(otpString);
  };

  const handleResend = () => {
    setCanResend(false);
    setTimeLeft(900); // Reset to 15 minutes
    setOtp(['', '', '', '', '', '', '']);
    onResendOTP();
    toast.success('New OTP sent to your email');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Teacher Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a 6-digit verification code to:<br />
            <span className="font-semibold text-blue-600">{email}</span>
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            ))}
          </div>

          {timeLeft > 0 ? (
            <p className="text-sm text-gray-500 mb-4">
              Code expires in <span className="font-semibold">{formatTime(timeLeft)}</span>
            </p>
          ) : (
            <p className="text-sm text-red-600 mb-4">
              Code expired. Please request a new one.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || otp.join('').length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleResend}
                disabled={!canResend || isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Resend Code
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Please check your WMSU email inbox (including spam folder)
          </p>
        </div>
      </div>
    </div>
  );
}
