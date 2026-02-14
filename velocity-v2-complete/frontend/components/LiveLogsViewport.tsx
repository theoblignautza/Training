import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { LogMessage } from '../types';

const LiveLogsViewport: React.FC = () => {
  const { logs } = useWebSocket();

  return (
    <div className="bg-slate-950 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm border border-slate-800">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live System Logs
        </h3>
        <span className="text-xs text-slate-500">{logs.length} entries</span>
      </div>
      <div className="space-y-1">
        {logs.slice(-30).reverse().map((log) => (
          <div key={log.id || `${log.timestamp}-${log.message}`} className={`${getLogColor(log.type)} text-xs`}>
            <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-slate-600 text-center py-8">No logs yet. System is ready.</div>
        )}
      </div>
    </div>
  );
};

function getLogColor(type: LogMessage['type']) {
  switch (type) {
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'success':
      return 'text-green-400';
    default:
      return 'text-blue-400';
  }
}

export default LiveLogsViewport;
