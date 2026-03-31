import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { RouteGuard } from './components/RouteGuard';

import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Tasks } from './pages/tasks/Tasks';
import { TaskDetail } from './pages/tasks/TaskDetail';
import { Progress } from './pages/progress/Progress';
import { MyHistory } from './pages/MyHistory';

/**
 * Redirects to the correct landing page based on role.
 * Must be rendered inside <AuthProvider> (it is — it lives inside <AppLayout>).
 */
function RoleRedirect() {
  const { role } = useAuth();
  return <Navigate to={role === 'admin' ? '/dashboard' : '/tasks'} replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* All protected routes share the AppLayout shell (auth guard is in AppLayout) */}
          <Route element={<AppLayout />}>
            {/* Root → role-aware landing */}
            <Route path="/" element={<RoleRedirect />} />

            {/* Admin-only Overview page */}
            <Route
              path="/dashboard"
              element={
                <RouteGuard adminOnly>
                  <Dashboard />
                </RouteGuard>
              }
            />

            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/history" element={<MyHistory />} />

            {/* Catch-all → role-aware redirect (inside AppLayout so auth guard runs) */}
            <Route path="*" element={<RoleRedirect />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
