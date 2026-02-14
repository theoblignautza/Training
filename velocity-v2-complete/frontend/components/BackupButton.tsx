import React, { useState } from 'react';

interface BackupButtonProps {
  deviceId: number;
  deviceName: string;
  onBackupStart?: () => void;
}

const BackupButton: React.FC<BackupButtonProps> = ({ deviceId, deviceName, onBackupStart }) => {
  const [loading, setLoading] = useState(false);
  
  const handleBackup = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`http://localhost:8080/api/v1/config/backup/${deviceId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Backup request failed');
      }
      
      if (onBackupStart) {
        onBackupStart();
      }
      
    } catch (error: any) {
      console.error('Backup error:', error);
      alert(`Backup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleBackup}
      disabled={loading}
      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-1.5"
      title={`Backup configuration from ${deviceName}`}
    >
      {loading ? (
        <>
          <span className="animate-spin">⟳</span>
          <span>Backing up...</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>Backup</span>
        </>
      )}
    </button>
  );
};

export default BackupButton;
