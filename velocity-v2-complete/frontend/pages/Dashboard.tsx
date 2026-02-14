import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveLogsViewport from '../components/LiveLogsViewport';
import BackupNotification from '../components/BackupNotification';
import BackupViewer from '../components/BackupViewer';
import TopViewer from '../components/TopViewer';
import DiscoveryPanel from '../components/DiscoveryPanel';
import { useWebSocket } from '../hooks/useWebSocket';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [stats, setStats] = useState({
    devices: 0,
    templates: 0,
    backups: 0
  });
  const [showBackupViewer, setShowBackupViewer] = useState(false);
  const [showTopViewer, setShowTopViewer] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const { connectionStatus } = useWebSocket();
  
  useEffect(() => {
    checkBackendHealth();
    loadStats();
    
    const interval = setInterval(() => {
      checkBackendHealth();
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/health');
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      setBackendStatus('offline');
    }
  };
  
  const loadStats = async () => {
    try {
      const [devicesRes, templatesRes, backupsRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/devices'),
        fetch('http://localhost:8080/api/v1/templates'),
        fetch('http://localhost:8080/api/v1/backups')
      ]);
      
      const [devices, templates, backups] = await Promise.all([
        devicesRes.json(),
        templatesRes.json(),
        backupsRes.json()
      ]);
      
      setStats({
        devices: devices.length,
        templates: templates.length,
        backups: backups.length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Velocity Network Manager v2.0
          </h1>
          <p className="text-slate-400">
            Multi-vendor configuration backup and network management
          </p>
        </div>
        
        <div className="mb-6 flex gap-4">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
            <span className={`w-2 h-2 rounded-full ${
              backendStatus === 'online' ? 'bg-green-500 animate-pulse' : 
              backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-white text-sm">Backend: {backendStatus}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></span>
            <span className="text-white text-sm">WebSocket: {connectionStatus}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-6 shadow-xl">
            <div className="text-blue-300 text-sm mb-2">Total Devices</div>
            <div className="text-4xl font-bold text-white">{stats.devices}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-lg p-6 shadow-xl">
            <div className="text-green-300 text-sm mb-2">Templates</div>
            <div className="text-4xl font-bold text-white">{stats.templates}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-6 shadow-xl">
            <div className="text-purple-300 text-sm mb-2">Total Backups</div>
            <div className="text-4xl font-bold text-white">{stats.backups}</div>
          </div>
        </div>
        
        <div className="mb-8">
          <LiveLogsViewport />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setShowDiscovery(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg p-6 text-left shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-2">🔍</div>
            <div className="font-semibold text-lg">Discover Devices</div>
            <div className="text-blue-200 text-sm">Scan network</div>
          </button>
          
          <button
            onClick={() => setShowBackupViewer(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg p-6 text-left shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-2">📁</div>
            <div className="font-semibold text-lg">View Configs</div>
            <div className="text-green-200 text-sm">Browse backups</div>
          </button>
          
          <button
            onClick={() => setShowTopViewer(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg p-6 text-left shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-2">🗺️</div>
            <div className="font-semibold text-lg">Top-Viewer</div>
            <div className="text-purple-200 text-sm">Network topology</div>
          </button>
          
          <button
            onClick={() => navigate('/devices')}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg p-6 text-left shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold text-lg">Manage Devices</div>
            <div className="text-orange-200 text-sm">Add/edit devices</div>
          </button>
        </div>
      </div>
      
      {showBackupViewer && <BackupViewer onClose={() => setShowBackupViewer(false)} />}
      {showTopViewer && <TopViewer onClose={() => setShowTopViewer(false)} />}
      {showDiscovery && <DiscoveryPanel onClose={() => setShowDiscovery(false)} />}
      <BackupNotification />
    </div>
  );
};

export default Dashboard;
