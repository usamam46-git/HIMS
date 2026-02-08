import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RootLayout from './components/layout/RootLayout';
import DoctorRegistration from './pages/setup/DoctorRegistration';
import OPDServicesSetup from './pages/setup/OPDServicesSetup';
import MRDetails from './pages/MRDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RootLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="mr-details" element={<MRDetails />} />
          <Route path="opd" element={<div className="p-4">OPD Module Placeholder</div>} />
          <Route path="reports" element={<div className="p-4">Reports Module Placeholder</div>} />

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
