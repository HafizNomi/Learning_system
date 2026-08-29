import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from './LoadingSpinner';

/**
 * Gate a route behind authentication, and optionally behind a set of roles.
 *
 * While the session is being re-hydrated on a hard refresh we render a spinner
 * rather than redirecting - otherwise a signed-in user gets bounced to /login
 * before their profile has finished loading.
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, isInitialising, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (isInitialising) {
    return <LoadingSpinner size="large" fullScreen />;
  }

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // The user object arrives with the login response, but a role check before it
  // lands would fail spuriously.
  if (roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
