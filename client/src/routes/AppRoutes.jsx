import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import MainLayout from '../layouts/MainLayout';

// Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import SymptomChecker from '../pages/SymptomChecker';
import Hospitals from '../pages/Hospitals';
import Analytics from '../pages/Analytics';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import ReportAnalyzer from '../pages/ReportAnalyzer';
import ConsultDoctor from '../pages/ConsultDoctor';
import ConsultationRoom from '../pages/ConsultationRoom';
import EmergencyHistory from '../pages/EmergencyHistory';
import HospitalNetwork from '../pages/HospitalNetwork';
import AmbulanceTracking from '../pages/AmbulanceTracking';
import ResourceManagement from '../pages/ResourceManagement';
import StaffManagement from '../pages/StaffManagement';
import IncomingEmergencies from '../pages/IncomingEmergencies';
import ActivePatients from '../pages/ActivePatients';
import Consultations from '../pages/Consultations';
import SOSPage from '../pages/SOSPage';

// --- Auth Guards ---

const PublicRoute = ({ children }) => {
  const { token, loading } = useAuthStore();
  const hasToken = token || localStorage.getItem('pulsepath-token');

  if (hasToken && loading) {
    return <div className="h-screen flex items-center justify-center text-sm font-semibold text-slate-400">Loading PulsePath AI...</div>;
  }

  if (hasToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user, loading } = useAuthStore();

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-sm font-semibold text-slate-400">Loading PulsePath AI...</div>;
  }

  const hasToken = token || localStorage.getItem('pulsepath-token');

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  // Role-based guard: if allowedRoles specified and user role doesn't match, redirect to dashboard
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Helper to wrap pages in layout + protection
const Protected = ({ children, roles }) => (
  <ProtectedRoute allowedRoles={roles}>
    <MainLayout>{children}</MainLayout>
  </ProtectedRoute>
);

const AppRoutes = () => {
  const { fetchProfile, token } = useAuthStore();
  const hasToken = token || localStorage.getItem('pulsepath-token');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <Routes>
      {/* ── Public Pages (redirect to dashboard if already logged in) ── */}
      <Route path="/" element={<PublicRoute><MainLayout><Landing /></MainLayout></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><MainLayout><Login /></MainLayout></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><MainLayout><Register /></MainLayout></PublicRoute>} />

      {/* ── Shared Protected Routes (all roles) ── */}
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/hospitals" element={<Protected><Hospitals /></Protected>} />

      {/* ── Patient Routes ── */}
      <Route path="/symptom-checker" element={<Protected roles={['PATIENT', 'DOCTOR']}><SymptomChecker /></Protected>} />
      <Route path="/report-analyzer" element={<Protected roles={['PATIENT', 'DOCTOR']}><ReportAnalyzer /></Protected>} />
      <Route path="/consult" element={<Protected roles={['PATIENT', 'DOCTOR']}><ConsultDoctor /></Protected>} />
      <Route path="/consultation/:id" element={<Protected roles={['PATIENT', 'DOCTOR']}><ConsultationRoom /></Protected>} />
      <Route path="/emergency-history" element={<Protected roles={['PATIENT']}><EmergencyHistory /></Protected>} />
      <Route path="/sos" element={<Protected roles={['PATIENT']}><SOSPage /></Protected>} />

      {/* ── Doctor Routes ── */}
      <Route path="/incoming-emergencies" element={<Protected roles={['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_STAFF']}><IncomingEmergencies /></Protected>} />
      <Route path="/active-patients" element={<Protected roles={['DOCTOR']}><ActivePatients /></Protected>} />
      <Route path="/consultations" element={<Protected roles={['DOCTOR']}><Consultations /></Protected>} />
      <Route path="/ai-reports" element={<Protected roles={['DOCTOR']}><ReportAnalyzer /></Protected>} />

      {/* ── Admin / Hospital Staff Routes ── */}
      <Route path="/analytics" element={<Protected roles={['SUPER_ADMIN', 'HOSPITAL_STAFF']}><Analytics /></Protected>} />
      <Route path="/hospital-network" element={<Protected roles={['SUPER_ADMIN', 'HOSPITAL_STAFF']}><HospitalNetwork /></Protected>} />
      <Route path="/ambulance-tracking" element={<Protected roles={['SUPER_ADMIN', 'HOSPITAL_STAFF']}><AmbulanceTracking /></Protected>} />
      <Route path="/resources" element={<Protected roles={['SUPER_ADMIN', 'HOSPITAL_STAFF']}><ResourceManagement /></Protected>} />
      <Route path="/staff" element={<Protected roles={['SUPER_ADMIN', 'HOSPITAL_STAFF']}><StaffManagement /></Protected>} />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to={hasToken ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default AppRoutes;
