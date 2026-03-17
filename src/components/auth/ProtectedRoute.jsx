import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const normalizeRole = (value = "") =>
    String(value).toLowerCase().trim().replace(/[-\s]+/g, "_");

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

  const role = normalizeRole(user?.role);
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole)
    : [];
  const isAllowed = normalizedAllowedRoles.length === 0 || normalizedAllowedRoles.includes(role);

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
