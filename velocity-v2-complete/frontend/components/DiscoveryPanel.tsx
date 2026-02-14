import React, { useState } from 'react';
import { scanNetwork, addDevice } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { useWebSocket } from '../hooks/useWebSocket';
import type { DiscoveredDevice } from '../types';

interface DiscoveryPanelProps {
  onClose: () => void;
  onDevicesFound: () => void;
}

const DiscoveryPanel: React.FC<DiscoveryPanelProps> = ({ onClose, onDevicesFound }) => {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(new Set());
  const { addNotification } = useNotifications();
  const { socket } = useWebSocket();

  const handleScan = async () => {
    setScanning(true);
    setDiscoveredDevices([]);
    setSelectedDevices(new Set());
    
    try {
      const response = await scanNetwork(subnet);
      addNotification(`Discovery started: Session ${response.sessionId}`, 'info');
      
      // Listen for discovery completion
      if (socket) {
        socket.once('discovery-complete', (data: { devices: DiscoveredDevice[] }) => {
          setDiscoveredDevices(data.devices);
          setScanning(false);
          addNotification(`Discovery complete: Found ${data.devices.length} devices`, 'success');
        });
      }
    } catch (error) {
      setScanning(false);
      addNotification(error instanceof Error ? error.message : 'Discovery failed', 'error');
    }
  };

  const toggleDevice = (index: number) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDevices(newSelected);
  };

  const handleAddSelected = async () => {
    const devicesToAdd = discoveredDevices.filter((_, index) => selectedDevices.has(index));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const device of devicesToAdd) {
      try {
        await addDevice({
          Hostname: device.Hostname,
          IPAddress: device.IPAddress,
          Protocol: device.SuggestedProtocol,
          Port: device.SuggestedPort,
          Username: 'admin', // Default username
          Password: 'admin'  // Default password - user should change
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    if (successCount > 0) {
      addNotification(`Added ${successCount} devices successfully`, 'success');
      onDevicesFound();
    }
    
    if (failCount > 0) {
      addNotification(`Failed to add ${failCount} devices`, 'warning');
    }
    
    setDiscoveredDevices([]);
    setSelectedDevices(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Network Discovery</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 border-b border-slate-700">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="subnet" className="block text-sm font-medium text-slate-300 mb-2">
                Subnet to Scan (CIDR notation)
              </label>
              <input
                type="text"
                id="subnet"
                value={subnet}
                onChange={(e) => setSubnet(e.target.value)}
                placeholder="192.168.1.0/24"
                disabled={scanning}
                className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Example: 192.168.1.0/24 (scans 192.168.1.1 - 192.168.1.254)
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleScan}
                disabled={scanning}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  scanning
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {scanning ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scanning...
                  </span>
                ) : (
                  'Start Scan'
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {scanning && (
            <div className="text-center py-12">
              <div className="text-blue-400 text-lg mb-2">Scanning network...</div>
              <div className="text-slate-400 text-sm">This may take a few moments</div>
            </div>
          )}
          
          {!scanning && discoveredDevices.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Enter a subnet and click "Start Scan" to discover devices</p>
            </div>
          )}
          
          {!scanning && discoveredDevices.length > 0 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  Found {discoveredDevices.length} devices
                </h3>
                <button
                  onClick={() => setSelectedDevices(new Set(discoveredDevices.map((_, i) => i)))}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Select All
                </button>
              </div>
              
              <div className="space-y-2">
                {discoveredDevices.map((device, index) => (
                  <div
                    key={index}
                    onClick={() => toggleDevice(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDevices.has(index)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDevices.has(index)}
                        onChange={() => toggleDevice(index)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold text-white">{device.Hostname}</span>
                          <span className="text-slate-400">{device.IPAddress}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm">
                          <span className={device.SSHAvailable ? 'text-green-400' : 'text-slate-600'}>
                            SSH: {device.SSHAvailable ? '✓ Available' : '✗ Not available'}
                          </span>
                          <span className={device.TelnetAvailable ? 'text-green-400' : 'text-slate-600'}>
                            Telnet: {device.TelnetAvailable ? '✓ Available' : '✗ Not available'}
                          </span>
                          <span className="text-blue-400">
                            Suggested: {device.SuggestedProtocol.toUpperCase()} ({device.SuggestedPort})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {discoveredDevices.length > 0 && (
          <div className="p-6 border-t border-slate-700 flex justify-between items-center">
            <div className="text-sm text-slate-400">
              {selectedDevices.size} of {discoveredDevices.length} devices selected
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedDevices.size === 0}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedDevices.size === 0
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Add Selected Devices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryPanel;
