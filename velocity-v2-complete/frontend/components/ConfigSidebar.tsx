import React, { useState, useEffect } from 'react';

interface Backup {
  ID: number;
  DeviceID: number;
  DeviceHostname: string;
  DeviceIP: string;
  Filename: string;
  Size: number;
  CreatedAt: string;
}

interface ConfigSidebarProps {
  onClose: () => void;
}

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({ onClose }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  
  useEffect(() => {
    loadBackups();
  }, []);
  
  const loadBackups = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/backups');
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectBackup = async (backup: Backup) => {
    setSelectedBackup(backup);
    setContentLoading(true);
    
    try {
      const response = await fetch(`http://localhost:8080/api/v1/backups/${backup.ID}/content`);
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Failed to load backup content:', error);
      setContent('Error loading configuration file');
    } finally {
      setContentLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (selectedBackup) {
      window.open(`http://localhost:8080/api/v1/backups/${selectedBackup.ID}/download`, '_blank');
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col animate-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>📁</span>
          Configuration Files
        </h2>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-slate-700 w-8 h-8 rounded flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex">
        {/* Backup List */}
        <div className="w-2/5 border-r border-slate-700 overflow-y-auto p-2 bg-slate-850">
          {loading ? (
            <div className="text-slate-500 text-center py-8">Loading...</div>
          ) : backups.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              No backups found
            </div>
          ) : (
            backups.map(backup => (
              <div
                key={backup.ID}
                onClick={() => handleSelectBackup(backup)}
                className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                  selectedBackup?.ID === backup.ID 
                    ? 'bg-blue-900 border border-blue-700' 
                    : 'bg-slate-800 hover:bg-slate-750 border border-transparent'
                }`}
              >
                <div className="text-white text-sm font-semibold truncate">
                  {backup.DeviceHostname}
                </div>
                <div className="text-slate-400 text-xs mt-1">
                  {backup.DeviceIP}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-500 text-xs">
                    {new Date(backup.CreatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {formatFileSize(backup.Size)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Content Viewer */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {selectedBackup ? (
            <>
              <div className="p-4 border-b border-slate-700 bg-slate-850">
                <div className="text-white font-semibold mb-1">
                  {selectedBackup.Filename}
                </div>
                <div className="text-slate-400 text-sm mb-3">
                  Device: {selectedBackup.DeviceHostname} ({selectedBackup.DeviceIP})
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>📥</span>
                    Download
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
                {contentLoading ? (
                  <div className="text-slate-500 text-center py-8">
                    Loading configuration...
                  </div>
                ) : (
                  <pre className="text-slate-300 text-xs font-mono leading-relaxed">
                    {content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <div>Select a backup to view</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigSidebar;
