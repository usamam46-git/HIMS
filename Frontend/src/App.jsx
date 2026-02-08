import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RootLayout from './components/layout/RootLayout';
import DoctorRegistration from './pages/setup/DoctorRegistration';
import OPDServicesSetup from './pages/setup/OPDServicesSetup';
import MRDetails from './pages/MRDetails';
import OPDReceipt from './pages/OPDReceipt';
import ConsultantPayments from './pages/ConsultantPayments';
import ShiftManagement from './pages/ShiftManagement';
import ReportsLayout from './pages/Reports/ReportsLayout';
import ShiftReport from './pages/Reports/ShiftReport';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RootLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="mr-details" element={<MRDetails />} />
          <Route path="opd" element={<OPDReceipt />} />
          <Route path="consultant-payments" element={<ConsultantPayments />} />
          <Route path="shift-management" element={<ShiftManagement />} />

          <Route path="reports" element={<ReportsLayout />}>
            <Route index element={<Navigate to="shift" replace />} />
            <Route path="shift" element={<ShiftReport />} />
            <Route path="daily" element={<div className="p-4">Daily Report Placeholder</div>} />
            <Route path="monthly" element={<div className="p-4">Monthly Report Placeholder</div>} />
            <Route path="yearly" element={<div className="p-4">Yearly Report Placeholder</div>} />
          </Route>

          {/* Setup Routes */}
          <Route path="setup/doctors" element={<DoctorRegistration />} />
          <Route path="setup/opd-services" element={<OPDServicesSetup />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
