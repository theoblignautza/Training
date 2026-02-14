
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Templates from './pages/Templates';
import Topology from './pages/Topology';
import { NotificationProvider } from './hooks/useNotifications';
import NotificationContainer from './components/Notification';

function App() {
  return (
    <NotificationProvider>
      <HashRouter>
        <div className="flex h-screen bg-slate-900 text-slate-100">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/topology" element={<Topology />} />
            </Routes>
          </main>
        </div>
        <NotificationContainer />
      </HashRouter>
    </NotificationProvider>
  );
}

export default App;
