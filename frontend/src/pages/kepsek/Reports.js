import React from 'react';
import AdminReports from '../admin/Reports';

// Kepala Sekolah reports sama dengan Admin reports (read-only)
const KepsekReports = () => {
  return <AdminReports />;
};

export default KepsekReports;
