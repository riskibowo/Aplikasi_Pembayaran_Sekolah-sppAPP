import React from 'react';
import AdminDashboard from '../admin/Dashboard';

// Kepala Sekolah dashboard sama dengan Admin dashboard (read-only)
const KepsekDashboard = () => {
  return <AdminDashboard />;
};

export default KepsekDashboard;
