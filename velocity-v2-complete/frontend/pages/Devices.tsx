
import React, { useState, useEffect, useCallback } from 'react';
import { getDevices, addDevice, updateDevice, deleteDevice } from '../services/api';
import type { Device } from '../types';
import Modal from '../components/Modal';
import DeviceForm from '../components/DeviceForm';
import BackupButton from '../components/BackupButton';
import { useNotifications } from '../hooks/useNotifications';
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons';

const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const { addNotification } = useNotifications();

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleOpenModal = (device?: Device) => {
    setEditingDevice(device || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };

  const handleSaveDevice = async (deviceData: Device | Omit<Device, 'ID'>) => {
    try {
      if ('ID' in deviceData) {
        await updateDevice(deviceData.ID, deviceData);
        addNotification('Device updated successfully.', 'success');
      } else {
        await addDevice(deviceData);
        addNotification('Device added successfully.', 'success');
      }
      fetchDevices();
      handleCloseModal();
    } catch (error) {
      addNotification(`Failed to save device: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await deleteDevice(id);
        addNotification('Device deleted successfully.', 'success');
        fetchDevices();
      } catch (error) {
        addNotification('Failed to delete device.', 'error');
      }
    }
  };

  const renderTableContent = () => {
    if (loading) {
      return <tr><td colSpan={4} className="text-center p-6">Loading devices...</td></tr>;
    }
    if (error) {
      return (
        <tr>
          <td colSpan={4} className="text-center p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchDevices}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors"
            >
              Retry
            </button>
          </td>
        </tr>
      );
    }
    if (devices.length === 0) {
      return <tr><td colSpan={4} className="text-center p-6">No devices found.</td></tr>;
    }
    return devices.map(device => (
      <tr key={device.ID} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{device.Hostname}</td>
        <td className="px-6 py-4">{device.IPAddress}</td>
        <td className="px-6 py-4">{(device.Vendor || device.Protocol || "unknown").toUpperCase()}</td>
        <td className="px-6 py-4 text-right">
          <div className="flex gap-2 justify-end">
            <BackupButton deviceId={device.ID} deviceName={device.Hostname} />
            <button onClick={() => handleOpenModal(device)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors"><EditIcon /></button>
            <button onClick={() => handleDeleteDevice(device.ID)} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><TrashIcon /></button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Devices</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
        >
          <PlusIcon />
          Add Device
        </button>
      </div>
      
      <div className="bg-slate-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-700">
            <tr>
              <th scope="col" className="px-6 py-3">Hostname</th>
              <th scope="col" className="px-6 py-3">IP Address</th>
              <th scope="col" className="px-6 py-3">Device Type</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderTableContent()}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDevice ? 'Edit Device' : 'Add New Device'}>
        <DeviceForm device={editingDevice} onSave={handleSaveDevice} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default Devices;
