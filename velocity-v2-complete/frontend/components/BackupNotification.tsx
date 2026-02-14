import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface BackupProgress {
  queueId: number;
  hostname: string;
  progress: number;
  message?: string;
}

const BackupNotification: React.FC = () => {
  const { socket } = useWebSocket();
  const [activeBackups, setActiveBackups] = useState<BackupProgress[]>([]);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('backup-started', (data: any) => {
      setActiveBackups(prev => [...prev, { 
        queueId: data.queueId, 
        hostname: data.hostname, 
        progress: 0 
      }]);
    });
    
    socket.on('backup-progress', (data: any) => {
      setActiveBackups(prev => prev.map(b => 
        b.queueId === data.queueId 
          ? { ...b, progress: data.progress, message: data.message } 
          : b
      ));
    });
    
    socket.on('backup-completed', (data: any) => {
      setTimeout(() => {
        setActiveBackups(prev => prev.filter(b => b.queueId !== data.queueId));
      }, 2000);
    });
    
    socket.on('backup-failed', (data: any) => {
      setTimeout(() => {
        setActiveBackups(prev => prev.filter(b => b.queueId !== data.queueId));
      }, 3000);
    });
    
    return () => {
      socket.off('backup-started');
      socket.off('backup-progress');
      socket.off('backup-completed');
      socket.off('backup-failed');
    };
  }, [socket]);
  
  if (activeBackups.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-sm">
      {activeBackups.map(backup => (
        <div 
          key={backup.queueId} 
          className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-4 shadow-2xl backdrop-blur-sm animate-slide-in"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-semibold text-sm">
              💾 {backup.hostname}
            </span>
            <span className="text-blue-300 text-sm font-mono">
              {backup.progress}%
            </span>
          </div>
          
          {backup.message && (
            <div className="text-blue-200 text-xs mb-2">
              {backup.message}
            </div>
          )}
          
          <div className="w-full bg-blue-950 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${backup.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default BackupNotification;
