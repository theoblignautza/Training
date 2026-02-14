
import React, { useState, useEffect, useCallback } from 'react';
import { getDevices, getTemplates, runComplianceCheck, getComplianceHistory } from '../services/api';
import type { Device, Template, ComplianceReport } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';

const Compliance: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [lastReport, setLastReport] = useState<ComplianceReport | null>(null);
  const [history, setHistory] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadingError, setInitialLoadingError] = useState<string|null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingError, setHistoryLoadingError] = useState<string|null>(null);
  const { addNotification } = useNotifications();

  const fetchInitialData = useCallback(async () => {
    setInitialLoadingError(null);
    try {
      const [devicesData, templatesData] = await Promise.all([getDevices(), getTemplates()]);
      setDevices(devicesData);
      setTemplates(templatesData);
      if (devicesData.length > 0) {
          setSelectedDevice(String(devicesData[0].ID));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setInitialLoadingError(errorMessage);
      addNotification(errorMessage, 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchHistory = useCallback(async () => {
    if (selectedDevice) {
      setHistoryLoading(true);
      setHistoryLoadingError(null);
      try {
        const historyData = await getComplianceHistory(Number(selectedDevice));
        setHistory(historyData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setHistory([]);
        setHistoryLoadingError(errorMessage);
      } finally {
        setHistoryLoading(false);
      }
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRunCheck = async () => {
    if (!selectedDevice || !selectedTemplate) {
      addNotification('Please select a device and a template.', 'error');
      return;
    }
    setLoading(true);
    setLastReport(null);
    try {
      const report = await runComplianceCheck(Number(selectedDevice), Number(selectedTemplate));
      setLastReport(report);
      setHistory(prev => [report, ...prev.filter(r => r.ID !== report.ID)]);
      addNotification('Compliance check complete.', 'success');
    } catch (error) {
      addNotification(`Failed to run compliance check: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const findTemplateName = (id: number) => templates.find(t => t.ID === id)?.Name || 'Unknown Template';

  const renderHistory = () => {
    if (historyLoading) return <p>Loading history...</p>;
    if (historyLoadingError) {
       return (
        <div className="text-center p-6">
          <p className="text-red-400 mb-4">{historyLoadingError}</p>
          <button onClick={fetchHistory} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors">
            Retry
          </button>
        </div>
      );
    }
    if (history.length === 0) return <p>No compliance history for this device.</p>;

    return (
      <ul className="space-y-4">
        {history.map(report => (
          <li key={report.ID} className="border border-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {report.Compliant ? <CheckCircleIcon /> : <XCircleIcon />}
                <div className="ml-3">
                  <p className={`font-semibold ${report.Compliant ? 'text-green-300' : 'text-red-300'}`}>
                    {report.Compliant ? 'Compliant' : 'Not Compliant'}
                  </p>
                  <p className="text-sm text-slate-300">Template: {findTemplateName(report.TemplateID)}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{new Date(report.Timestamp).toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Compliance</h1>
      
      {initialLoadingError ? (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-8" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{initialLoadingError}</span>
             <div className="mt-4">
               <button onClick={fetchInitialData} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors">
                 Retry
               </button>
             </div>
          </div>
      ) : (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Run New Check</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="device-select" className="block text-sm font-medium text-slate-300">Device</label>
              <select id="device-select" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">Select a device</option>
                {devices.map(d => <option key={d.ID} value={d.ID}>{d.Hostname}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="template-select" className="block text-sm font-medium text-slate-300">Template</label>
              <select id="template-select" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">Select a template</option>
                {templates.map(t => <option key={t.ID} value={t.ID}>{t.Name}</option>)}
              </select>
            </div>
            <button onClick={handleRunCheck} disabled={loading || !selectedDevice || !selectedTemplate} className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Running...' : 'Run Check'}
            </button>
          </div>
        </div>
      )}
      
      {lastReport && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Last Check Result</h2>
            <div className={`flex items-center p-4 rounded-md ${lastReport.Compliant ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {lastReport.Compliant ? <CheckCircleIcon /> : <XCircleIcon />}
                <span className={`ml-3 font-bold ${lastReport.Compliant ? 'text-green-300' : 'text-red-300'}`}>
                    {lastReport.Compliant ? 'Compliant' : 'Not Compliant'}
                </span>
            </div>
            <pre className="mt-4 bg-slate-900 p-4 rounded-md text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                {lastReport.Report}
            </pre>
        </div>
      )}

      <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Compliance History for {devices.find(d => d.ID === Number(selectedDevice))?.Hostname || '...'}</h2>
        {renderHistory()}
      </div>
    </div>
  );
};

export default Compliance;
