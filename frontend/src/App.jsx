import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import PlaceOrderPage from './pages/customer/PlaceOrderPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import AdminLayout from './pages/admin/AdminLayout';
import AgentDashboard from './pages/agent/AgentDashboard';
import TrackOrderPage from './pages/TrackOrderPage';
import ProfilePage from './pages/ProfilePage';

// Route guards
function RequireAuth({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-page">
      <span className="spinner" style={{ width: 48, height: 48 }} />
      <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to correct home for their role
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/track/:id" element={<TrackOrderPage />} />

      {/* Root — Landing page for everyone */}
      <Route path="/" element={<LandingPage />} />

      {/* Profile route for any authenticated user */}
      <Route path="/profile" element={
        <RequireAuth>
          <ProfilePage />
        </RequireAuth>
      } />

      {/* Customer routes */}
      <Route path="/dashboard" element={
        <RequireAuth allowedRoles={['CUSTOMER']}>
          <CustomerDashboard />
        </RequireAuth>
      } />
      <Route path="/place-order" element={
        <RequireAuth allowedRoles={['CUSTOMER']}>
          <PlaceOrderPage />
        </RequireAuth>
      } />
      <Route path="/orders/:id" element={
        <RequireAuth allowedRoles={['CUSTOMER', 'ADMIN', 'AGENT']}>
          <OrderDetailPage />
        </RequireAuth>
      } />

      {/* Admin routes — layout with nested routes */}
      <Route path="/admin/*" element={
        <RequireAuth allowedRoles={['ADMIN']}>
          <AdminLayout />
        </RequireAuth>
      } />

      {/* Agent routes */}
      <Route path="/agent" element={
        <RequireAuth allowedRoles={['AGENT']}>
          <AgentDashboard />
        </RequireAuth>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
