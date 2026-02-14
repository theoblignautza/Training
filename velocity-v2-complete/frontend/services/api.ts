import type { Device, Template, ComplianceReport, Backup, DiscoveredDevice, BackupSchedule } from '../types';

const API_BASE_URL = 'http://localhost:8080/api/v1';

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Connection failed. Please ensure the backend server is running and that CORS is configured correctly.');
    }
    throw error;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
    throw new Error(error.message);
  }
  return response.json();
}

// Device API
export const getDevices = async (): Promise<Device[]> => {
  const response = await apiFetch(`${API_BASE_URL}/devices`);
  return handleResponse<Device[]>(response);
};
export const getDevice = async (id: number): Promise<Device> => {
  const response = await apiFetch(`${API_BASE_URL}/devices/${id}`);
  return handleResponse<Device>(response);
};
export const addDevice = async (device: Omit<Device, 'ID'>): Promise<Device> => {
  const response = await apiFetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device),
  });
  return handleResponse<Device>(response);
};
export const updateDevice = async (id: number, device: Partial<Device>): Promise<Device> => {
  const response = await apiFetch(`${API_BASE_URL}/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device),
  });
  return handleResponse<Device>(response);
};
export const deleteDevice = async (id: number): Promise<void> => {
    const response = await apiFetch(`${API_BASE_URL}/devices/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message);
    }
};

// Template API
export const getTemplates = async (): Promise<Template[]> => {
    const response = await apiFetch(`${API_BASE_URL}/templates`);
    return handleResponse<Template[]>(response);
};
export const addTemplate = async (template: Omit<Template, 'ID'>): Promise<Template> => {
    const response = await apiFetch(`${API_BASE_URL}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
    });
    return handleResponse<Template>(response);
};
export const updateTemplate = async (id: number, template: Partial<Template>): Promise<Template> => {
    const response = await apiFetch(`${API_BASE_URL}/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
    });
    return handleResponse<Template>(response);
};
export const deleteTemplate = async (id: number): Promise<void> => {
    const response = await apiFetch(`${API_BASE_URL}/templates/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message);
    }
};

// Compliance API
export const runComplianceCheck = async (deviceId: number, templateId: number): Promise<ComplianceReport> => {
    const response = await apiFetch(`${API_BASE_URL}/compliance/check/${deviceId}/${templateId}`, {
        method: 'POST'
    });
    return handleResponse<ComplianceReport>(response);
};
export const getComplianceHistory = async (deviceId: number): Promise<ComplianceReport[]> => {
    const response = await apiFetch(`${API_BASE_URL}/compliance/history/${deviceId}`);
    return handleResponse<ComplianceReport[]>(response);
};

// Config API
export const backupConfig = async (deviceId: number): Promise<{message: string}> => {
    const response = await apiFetch(`${API_BASE_URL}/config/backup/${deviceId}`, {
        method: 'POST',
    });
    return handleResponse<{message: string}>(response);
};
export const pushConfig = async (deviceId: number, templateId: number): Promise<{message: string}> => {
    const response = await apiFetch(`${API_BASE_URL}/config/push/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
    });
    return handleResponse<{message: string}>(response);
};

// Discovery API
export const scanNetwork = async (subnet?: string): Promise<{message: string, sessionId: number}> => {
    const response = await apiFetch(`${API_BASE_URL}/discovery/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet }),
    });
    return handleResponse<{message: string, sessionId: number}>(response);
};

// Backups API
export const getBackups = async (deviceId?: number): Promise<Backup[]> => {
    const url = deviceId 
        ? `${API_BASE_URL}/backups?deviceId=${deviceId}`
        : `${API_BASE_URL}/backups`;
    const response = await apiFetch(url);
    return handleResponse<Backup[]>(response);
};

export const getBackupContent = async (backupId: number): Promise<{filename: string, content: string}> => {
    const response = await apiFetch(`${API_BASE_URL}/backups/${backupId}/content`);
    return handleResponse<{filename: string, content: string}>(response);
};

export const downloadBackup = async (backupId: number): Promise<void> => {
    window.open(`${API_BASE_URL}/backups/${backupId}/download`, '_blank');
};

export const deleteBackup = async (backupId: number): Promise<void> => {
    const response = await apiFetch(`${API_BASE_URL}/backups/${backupId}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message);
    }
};

// Restore API
export const restoreConfig = async (deviceId: number, backupId?: number, configContent?: string): Promise<{message: string, output: string}> => {
    const response = await apiFetch(`${API_BASE_URL}/config/restore/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, configContent }),
    });
    return handleResponse<{message: string, output: string}>(response);
};

// Health check
export const checkHealth = async (): Promise<{status: string, timestamp: string}> => {
    const response = await apiFetch(`${API_BASE_URL}/health`);
    return handleResponse<{status: string, timestamp: string}>(response);
};


// Scheduler API
export const getSchedules = async (): Promise<BackupSchedule[]> => {
    const response = await apiFetch(`${API_BASE_URL}/scheduler`);
    return handleResponse<BackupSchedule[]>(response);
};

export const createSchedule = async (payload: { name: string; time: string; days: string[]; deviceIds?: number[] }): Promise<BackupSchedule> => {
    const response = await apiFetch(`${API_BASE_URL}/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<BackupSchedule>(response);
};
