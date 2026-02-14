import React, { useState, useEffect } from 'react';
import { getBackups, getBackupContent, restoreConfig, deleteBackup, getDevices, downloadBackup, getSchedules, createSchedule } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import type { Backup, Device, BackupSchedule } from '../types';

interface BackupViewerProps {
  onClose: () => void;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BackupViewer: React.FC<BackupViewerProps> = ({ onClose }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [backupContent, setBackupContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [scheduleName, setScheduleName] = useState('Nightly backup');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleDays, setScheduleDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [backupsData, devicesData, schedulesData] = await Promise.all([getBackups(), getDevices(), getSchedules()]);
      setBackups(backupsData);
      setDevices(devicesData);
      setSchedules(schedulesData);
    } catch {
      addNotification('Failed to load backup data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBackup = async (backup: Backup) => {
    try {
      const content = await getBackupContent(backup.ID);
      setBackupContent(content.content);
      setSelectedBackup(backup);
      setSelectedDevice(backup.DeviceID);
    } catch {
      addNotification('Failed to load backup content', 'error');
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup || !selectedDevice) return addNotification('Select backup and target device', 'warning');
    setRestoring(true);
    try {
      await restoreConfig(selectedDevice, selectedBackup.ID);
      addNotification('Configuration restored successfully', 'success');
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleScheduleCreate = async () => {
    try {
      await createSchedule({ name: scheduleName, time: scheduleTime, days: scheduleDays });
      addNotification('Backup schedule created', 'success');
      const next = await getSchedules();
      setSchedules(next);
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Failed to create schedule', 'error');
    }
  };

  const toggleDay = (day: string) => {
    setScheduleDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const formatFileSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700"><h2 className="text-2xl font-bold text-white">Backup & Restore Center</h2><button onClick={onClose} className="text-slate-400 hover:text-white">✕</button></div>
        <div className="grid grid-cols-12 flex-1 min-h-0">
          <div className="col-span-3 border-r border-slate-700 p-4 overflow-auto">
            <h3 className="text-white font-semibold mb-3">Backup Files</h3>
            {loading ? <div className="text-slate-500">Loading...</div> : backups.map((backup) => (
              <div key={backup.ID} onClick={() => handleViewBackup(backup)} className={`p-2 mb-2 rounded border cursor-pointer ${selectedBackup?.ID === backup.ID ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}>
                <div className="text-sm text-white">{backup.DeviceHostname || backup.Filename}</div>
                <div className="text-xs text-slate-400">{formatFileSize(backup.Size)}</div>
                <div className="flex gap-2 mt-1">
                  <button onClick={(e) => { e.stopPropagation(); downloadBackup(backup.ID); }} className="text-xs text-blue-300">Download</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteBackup(backup.ID).then(loadData); }} className="text-xs text-red-300">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="col-span-6 border-r border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400">Restore target</label>
                <select value={selectedDevice || ''} onChange={(e) => setSelectedDevice(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white">
                  <option value="">Select device...</option>
                  {devices.map((device) => <option key={device.ID} value={device.ID}>{device.Hostname} ({device.IPAddress})</option>)}
                </select>
              </div>
              <button onClick={handleRestore} disabled={!selectedBackup || !selectedDevice || restoring} className="px-4 py-2 bg-green-600 disabled:bg-slate-700 rounded text-white">{restoring ? 'Restoring...' : 'Restore'}</button>
            </div>
            <pre className="flex-1 p-4 text-xs text-slate-300 font-mono overflow-auto bg-slate-950">{backupContent || 'Select a backup to inspect configuration content.'}</pre>
          </div>

          <div className="col-span-3 p-4 overflow-auto">
            <h3 className="text-white font-semibold mb-3">Backup Scheduler</h3>
            <input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} className="w-full mb-2 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" placeholder="Schedule name" />
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full mb-2 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
            <div className="grid grid-cols-4 gap-1 mb-2">{weekdays.map((day) => <button key={day} onClick={() => toggleDay(day)} className={`px-2 py-1 text-xs rounded ${scheduleDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{day}</button>)}</div>
            <button onClick={handleScheduleCreate} className="w-full bg-indigo-600 py-2 rounded text-white">Create recurring schedule</button>
            <h4 className="text-slate-300 text-sm mt-4 mb-2">Upcoming jobs</h4>
            <div className="space-y-2">{schedules.slice(0, 8).map((s) => <div key={s.ID} className="bg-slate-800 rounded p-2 text-xs"><div className="text-white">{s.Name}</div><div className="text-slate-400">{s.CronExpression}</div><div className="text-slate-500">Last run: {s.LastRun || 'Never'}</div></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupViewer;
