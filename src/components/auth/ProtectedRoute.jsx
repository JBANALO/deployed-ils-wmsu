import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import authService from "../../api/userService";

export default function ProtectedRoute({ allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        console.log('ProtectedRoute: Fetching current user...');
        const response = await authService.getCurrentUser();
        console.log('ProtectedRoute: Current user response:', response);
        if (!isMounted) return;

        const currentUser = response?.data || response;
        console.log('ProtectedRoute: Current user:', currentUser);
        console.log('ProtectedRoute: User role:', currentUser?.user?.role);
        console.log('ProtectedRoute: Allowed roles:', allowedRoles);
        
        setUser(currentUser || null);
      } catch (err) {
        console.log('ProtectedRoute: Error fetching user:', err);
        console.log('ProtectedRoute: Error details:', err.response?.data);
        if (!isMounted) return;
        setUser(null);
        setError("Unauthorized");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-montserrat">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || error) {
    console.log('ProtectedRoute: No user or error, redirecting to login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user.user?.role?.toLowerCase();
  const isAllowed = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role);
  
  console.log('ProtectedRoute: Role check - user role:', role, 'allowed:', allowedRoles, 'isAllowed:', isAllowed);

  if (!isAllowed) {
    console.log('ProtectedRoute: Role not allowed, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: Access granted, rendering outlet');
  return <Outlet />;
}
