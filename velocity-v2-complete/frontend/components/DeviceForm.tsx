
import React, { useState, useEffect } from 'react';
import type { Device } from '../types';

interface DeviceFormProps {
  device?: Device | null;
  onSave: (device: Device | Omit<Device, 'ID'>) => void;
  onCancel: () => void;
}

const DeviceForm: React.FC<DeviceFormProps> = ({ device, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    Hostname: '',
    IPAddress: '',
    Protocol: 'ssh' as 'ssh' | 'telnet',
    Port: 22,
    Username: '',
    Password: '',
  });

  useEffect(() => {
    if (device) {
      setFormData({
        Hostname: device.Hostname,
        IPAddress: device.IPAddress,
        Protocol: device.Protocol || 'ssh',
        Port: device.Port || 22,
        Username: device.Username,
        Password: '', // Don't pre-fill password
      });
    } else {
      setFormData({
        Hostname: '',
        IPAddress: '',
        Protocol: 'ssh',
        Port: 22,
        Username: '',
        Password: '',
      });
    }
  }, [device]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'Port') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const protocol = e.target.value as 'ssh' | 'telnet';
    setFormData(prev => ({ 
      ...prev, 
      Protocol: protocol,
      Port: protocol === 'ssh' ? 22 : 23
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = { ...formData };
    if (device) {
      // Don't send empty password on update unless it's being changed
      if (!submissionData.Password) {
        delete (submissionData as Partial<typeof submissionData>).Password;
      }
      onSave({ ...device, ...submissionData });
    } else {
      onSave(submissionData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="Hostname" className="block text-sm font-medium text-slate-300">Hostname</label>
        <input type="text" name="Hostname" id="Hostname" value={formData.Hostname} onChange={handleChange} required className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div>
        <label htmlFor="IPAddress" className="block text-sm font-medium text-slate-300">IP Address</label>
        <input type="text" name="IPAddress" id="IPAddress" value={formData.IPAddress} onChange={handleChange} required className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="Protocol" className="block text-sm font-medium text-slate-300">Protocol</label>
          <select 
            name="Protocol" 
            id="Protocol" 
            value={formData.Protocol} 
            onChange={handleProtocolChange} 
            required 
            className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="ssh">SSH</option>
            <option value="telnet">Telnet</option>
          </select>
        </div>
        <div>
          <label htmlFor="Port" className="block text-sm font-medium text-slate-300">Port</label>
          <input 
            type="number" 
            name="Port" 
            id="Port" 
            value={formData.Port} 
            onChange={handleChange} 
            required 
            min="1" 
            max="65535"
            className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
          />
        </div>
      </div>
      <div>
        <label htmlFor="Username" className="block text-sm font-medium text-slate-300">Username</label>
        <input type="text" name="Username" id="Username" value={formData.Username} onChange={handleChange} required className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div>
        <label htmlFor="Password" className="block text-sm font-medium text-slate-300">Password</label>
        <input type="password" name="Password" id="Password" value={formData.Password} onChange={handleChange} required={!device} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder={device ? "Leave blank to keep unchanged" : ""} />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">Save Device</button>
      </div>
    </form>
  );
};

export default DeviceForm;
