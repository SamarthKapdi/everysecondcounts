import React from 'react';
import useAuthStore from '../store/authStore';
import PatientDashboard from '../components/dashboards/PatientDashboard';
import DoctorDashboard from '../components/dashboards/DoctorDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { user } = useAuthStore();
  const role = user?.role || 'PATIENT';

  if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_STAFF') {
    return <AdminDashboard />;
  }

  if (role === 'DOCTOR') {
    return <DoctorDashboard />;
  }

  return <PatientDashboard />;
};

export default Dashboard;
