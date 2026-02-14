
export interface Device {
  ID: number;
  Hostname: string;
  IPAddress: string;
  Protocol: 'ssh' | 'telnet';
  Port: number;
  Username: string;
  Password?: string;
  Enabled?: boolean;
  Vendor?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Template {
  ID: number;
  Name: string;
  Content: string;
  Description?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface ComplianceReport {
  ID: number;
  DeviceID: number;
  TemplateID: number;
  Compliant: boolean;
  Report: string;
  Timestamp: string;
  Device?: Device;
  Template?: Template;
}

export interface Backup {
  ID: number;
  DeviceID: number;
  Filename: string;
  Filepath: string;
  Size: number;
  CreatedAt: string;
  DeviceHostname?: string;
  DeviceIP?: string;
}

export interface DiscoveredDevice {
  IPAddress: string;
  Hostname: string;
  SSHAvailable: boolean;
  TelnetAvailable: boolean;
  SuggestedProtocol: 'ssh' | 'telnet';
  SuggestedPort: number;
}

export interface LogMessage {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface BackupSchedule {
  ID: number;
  Name: string;
  CronExpression: string;
  Enabled: boolean;
  LastRun?: string;
  NextRun?: string;
}
