import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const ParentVerification = () => {
  const [searchParams] = useSearchParams();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Get student info from URL params
  const studentId = searchParams.get('studentId');
  const studentName = searchParams.get('studentName') || 'Student';
  const parentEmail = searchParams.get('parentEmail') || 'Parent';

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/parent-verification/verify-otp`, {
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
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#4CAF50',
            marginBottom: '20px'
          }}>
            ✓
          </div>
          <h2 style={{ color: '#333', marginBottom: '16px' }}>
            Verification Successful!
          </h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Thank you! Your parent account for {studentName} has been successfully verified.
          </p>
          <p style={{ color: '#888', fontSize: '14px' }}>
            You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#333', marginBottom: '16px' }}>
            Parent Verification
          </h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            Student: <strong>{studentName}</strong>
          </p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Email: <strong>{parentEmail}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: 'bold'
            }}>
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '8px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || otp.length !== 6}
            style={{
              width: '100%',
              padding: '14px',
              background: isVerifying || otp.length !== 6 ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isVerifying || otp.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {isVerifying ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: '#888'
        }}>
          <p>Check your email for the verification code.</p>
          <p>The code will expire in 15 minutes.</p>
        </div>
      </div>
    </div>
  );
};

export default ParentVerification;
