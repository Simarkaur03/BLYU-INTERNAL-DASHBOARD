import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * RouteGuard — blocks users from reaching admin-only pages and vice versa.
 *
 * Admin-only pages: /dashboard
 * If a non-admin hits /dashboard → redirect to /tasks
 *
 * (Admins can visit /tasks and /progress — those pages already branch on role)
 */
export function RouteGuard({ children, adminOnly = false }) {
  const { role } = useAuth();
  const location = useLocation();

  if (adminOnly && role !== 'admin') {
    return <Navigate to="/tasks" replace state={{ from: location }} />;
  }

  return children;
}
