import React, { useRef, useEffect } from 'react';
import type { LogMessage } from '../types';

interface LogViewerProps {
  logs: LogMessage[];
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onClose }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: LogMessage['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const getLogIcon = (type: LogMessage['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Live System Logs</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-slate-950">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              No logs yet. Logs will appear here as operations are performed.
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={log.id || `${log.timestamp}-${index}`} className="flex items-start space-x-2 hover:bg-slate-900 p-2 rounded">
                  <span className={`${getLogColor(log.type)} font-bold flex-shrink-0`}>
                    {getLogIcon(log.type)}
                  </span>
                  <span className="text-slate-500 flex-shrink-0 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`${getLogColor(log.type)} flex-1`}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-700 bg-slate-900 flex justify-between items-center">
          <div className="text-sm text-slate-400">
            {logs.length} log entries
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
