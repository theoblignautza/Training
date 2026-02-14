import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LogMessage } from '../types';

const SOCKET_URL = 'http://localhost:8080';
const MAX_LOGS = 300;

type Listener = (logs: LogMessage[]) => void;

let sharedSocket: Socket | null = null;
let sharedConnected = false;
let sharedLogs: LogMessage[] = [];
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener([...sharedLogs]));
}

function pushLog(log: LogMessage) {
  sharedLogs = [...sharedLogs, log].slice(-MAX_LOGS);
  notifyListeners();
}

function ensureSocket() {
  if (sharedSocket) return sharedSocket;

  sharedSocket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10
  });

  sharedSocket.on('connect', () => {
    sharedConnected = true;
  });

  sharedSocket.on('disconnect', () => {
    sharedConnected = false;
  });

  sharedSocket.on('log', (incomingLog: LogMessage) => {
    const enrichedLog: LogMessage = {
      ...incomingLog,
      id: incomingLog.id || `${incomingLog.timestamp}-${Math.random().toString(36).slice(2, 8)}`
    };
    pushLog(enrichedLog);
  });

  return sharedSocket;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(() => ensureSocket());
  const [connected, setConnected] = useState(sharedConnected);
  const [logs, setLogs] = useState<LogMessage[]>(sharedLogs);

  useEffect(() => {
    const socketInstance = ensureSocket();
    setSocket(socketInstance);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    const listener: Listener = (nextLogs) => setLogs(nextLogs);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, []);

  const clearLogs = useCallback(() => {
    sharedLogs = [];
    notifyListeners();
  }, []);

  const subscribe = useCallback((room: string) => {
    if (socket) socket.emit('subscribe', room);
  }, [socket]);

  const unsubscribe = useCallback((room: string) => {
    if (socket) socket.emit('unsubscribe', room);
  }, [socket]);

  return {
    socket,
    connected,
    connectionStatus: connected ? 'connected' : 'disconnected',
    logs,
    clearLogs,
    subscribe,
    unsubscribe
  };
}
