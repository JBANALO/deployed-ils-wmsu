import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Get token and user from URL parameters
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const error = params.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      navigate('/login?error=auth_failed');
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));

        // Store token and user
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        const role = user.role?.toLowerCase();

        // Redirect based on role
        if (role === 'admin') {
          navigate('/admin/admin-dashboard');
        } else if (role === 'teacher' || role === 'subject_teacher' || role === 'adviser') {
          navigate('/teacher/teacher-dashboard');
        } else {
          navigate('/student/student-dashboard');
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        navigate('/login?error=invalid_response');
      }
    } else {
      navigate('/login?error=missing_token');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Signing you in...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
      </div>
    </div>
  );
}
