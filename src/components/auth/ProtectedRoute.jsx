import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  // Read token and user from localStorage (saved during login)
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!token || !storedUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  let user;
  try {
    user = JSON.parse(storedUser);
  } catch {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user?.role?.toLowerCase();
  const isAllowed = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
