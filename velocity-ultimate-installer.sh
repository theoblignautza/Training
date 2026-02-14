#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════
# Velocity Network Manager v3.0 - All-in-One Installer
# Complete installation, management, and code deployment system
# Version: 3.0.0
#═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
APP_NAME="Velocity Network Manager"
VERSION="3.0.0"
INSTALL_DIR="$(pwd)"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
LOG_DIR="$INSTALL_DIR/logs"
PID_DIR="$INSTALL_DIR/.pids"
DATA_DIR="$BACKEND_DIR/data"
BACKUPS_DIR="$BACKEND_DIR/backups"

# Node.js version
REQUIRED_NODE_VERSION=20

#═══════════════════════════════════════════════════════════════════════════
# Utility Functions
#═══════════════════════════════════════════════════════════════════════════

print_header() {
    clear
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}   $APP_NAME v$VERSION - All-in-One Installer${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_separator() {
    echo -e "${BLUE}───────────────────────────────────────────────────────${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

pause() {
    echo ""
    read -p "Press Enter to continue..."
}

check_node_version() {
    if command -v node &> /dev/null; then
        local version=$(node --version)
        local major=$(echo $version | cut -d'.' -f1 | tr -d 'v')
        echo "$major"
    else
        echo "0"
    fi
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        info "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
        
        if check_port $port; then
            error "Failed to kill process on port $port"
            return 1
        else
            success "Process on port $port terminated"
            return 0
        fi
    fi
    return 0
}

#═══════════════════════════════════════════════════════════════════════════
# Embedded Code Files
#═══════════════════════════════════════════════════════════════════════════

create_enhanced_device_manager() {
    info "Creating enhanced device-manager.js..."
    
    cat > "$BACKEND_DIR/utils/device-manager.js" << 'DEVICE_MANAGER_EOF'
const { NodeSSH } = require('node-ssh');
const Telnet = require('telnet-client');
const path = require('path');
const fs = require('fs').promises;

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
fs.mkdir(BACKUPS_DIR, { recursive: true }).catch(console.error);

const VENDOR_COMMANDS = {
  cisco: {
    disablePaging: 'terminal length 0',
    showConfig: 'show running-config',
    enterConfig: 'configure terminal',
    saveConfig: 'write memory',
    exitConfig: 'end'
  },
  ubiquiti: {
    disablePaging: 'terminal length 0',
    showConfig: 'show configuration commands',
    enterConfig: 'configure',
    saveConfig: 'save',
    exitConfig: 'exit'
  },
  aruba: {
    disablePaging: 'no paging',
    showConfig: 'show running-config',
    enterConfig: 'configure terminal',
    saveConfig: 'write memory',
    exitConfig: 'end'
  },
  generic: {
    disablePaging: 'terminal length 0',
    showConfig: 'show running-config',
    enterConfig: 'configure terminal',
    saveConfig: 'write memory',
    exitConfig: 'end'
  }
};

async function getDeviceInfo(device, io) {
  const ssh = new NodeSSH();
  
  try {
    io?.emit('log', {
      type: 'info',
      message: `Connecting to ${device.ip_address}:${device.port || 22} to gather info...`,
      timestamp: new Date().toISOString()
    });
    
    await ssh.connect({
      host: device.ip_address,
      port: device.port || 22,
      username: device.username,
      password: device.password,
      readyTimeout: 30000,
      tryKeyboard: true
    });
    
    const hostnameResult = await ssh.execCommand('hostname');
    const hostname = hostnameResult.stdout.trim() || device.hostname || device.ip_address;
    
    const versionResult = await ssh.execCommand('show version');
    const versionText = versionResult.stdout;
    
    let vendor = 'unknown';
    let model = 'unknown';
    
    if (versionText.includes('Cisco IOS') || versionText.includes('cisco')) {
      vendor = 'Cisco';
      const modelMatch = versionText.match(/cisco\s+(\S+)/i);
      if (modelMatch) model = modelMatch[1];
    } else if (versionText.includes('Ubiquiti')) {
      vendor = 'Ubiquiti';
      const modelMatch = versionText.match(/EdgeRouter\s+(\S+)/i);
      if (modelMatch) model = modelMatch[1];
    } else if (versionText.includes('ArubaOS')) {
      vendor = 'Aruba';
      const modelMatch = versionText.match(/(\d+\S+)\s+Controller/);
      if (modelMatch) model = modelMatch[1];
    }
    
    ssh.dispose();
    
    return { hostname, vendor, model, ip_address: device.ip_address };
  } catch (error) {
    ssh.dispose();
    throw new Error(`Failed to get device info: ${error.message}`);
  }
}

async function backupViaSSH(device, io) {
  const ssh = new NodeSSH();
  
  try {
    io?.emit('log', {
      type: 'info',
      message: `Establishing SSH connection to ${device.ip_address}:${device.port || 22}...`,
      timestamp: new Date().toISOString()
    });
    
    await ssh.connect({
      host: device.ip_address,
      port: device.port || 22,
      username: device.username,
      password: device.password,
      readyTimeout: 30000,
      tryKeyboard: true
    });
    
    io?.emit('log', {
      type: 'success',
      message: 'SSH connection established',
      timestamp: new Date().toISOString()
    });
    
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    if (commands.disablePaging) {
      await ssh.execCommand(commands.disablePaging);
    }
    
    io?.emit('log', {
      type: 'info',
      message: `Executing: ${commands.showConfig}`,
      timestamp: new Date().toISOString()
    });
    
    const result = await ssh.execCommand(commands.showConfig);
    
    if (result.code !== 0 && result.stderr) {
      throw new Error(`Command failed: ${result.stderr}`);
    }
    
    const config = result.stdout;
    
    if (!config || config.length < 50) {
      throw new Error('Configuration appears to be empty or invalid');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const hostname = device.hostname || device.ip_address.replace(/\./g, '_');
    const filename = `${hostname}_${timestamp}.cfg`;
    const filepath = path.join(BACKUPS_DIR, filename);
    
    await fs.writeFile(filepath, config, 'utf8');
    
    io?.emit('log', {
      type: 'success',
      message: `Configuration saved: ${filename} (${config.length} bytes)`,
      timestamp: new Date().toISOString()
    });
    
    ssh.dispose();
    
    return { filename, filepath, config, size: config.length, device_id: device.id, timestamp: new Date().toISOString() };
  } catch (error) {
    ssh.dispose();
    io?.emit('log', {
      type: 'error',
      message: `Backup failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

async function backupViaTelnet(device, io) {
  const telnet = new Telnet();
  
  const params = {
    host: device.ip_address,
    port: device.port || 23,
    shellPrompt: /[$#>]$/,
    timeout: 30000,
    loginPrompt: /[Uu]sername:|[Ll]ogin:/,
    passwordPrompt: /[Pp]assword:/,
    username: device.username,
    password: device.password,
    irs: '\r\n',
    ors: '\n',
    echoLines: 1
  };
  
  try {
    io?.emit('log', {
      type: 'info',
      message: `Establishing Telnet connection to ${device.ip_address}:${device.port || 23}...`,
      timestamp: new Date().toISOString()
    });
    
    await telnet.connect(params);
    
    io?.emit('log', {
      type: 'success',
      message: 'Telnet connection established',
      timestamp: new Date().toISOString()
    });
    
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    if (commands.disablePaging) {
      await telnet.send(commands.disablePaging);
    }
    
    io?.emit('log', {
      type: 'info',
      message: `Executing: ${commands.showConfig}`,
      timestamp: new Date().toISOString()
    });
    
    const config = await telnet.send(commands.showConfig);
    
    if (!config || config.length < 50) {
      throw new Error('Configuration appears to be empty or invalid');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const hostname = device.hostname || device.ip_address.replace(/\./g, '_');
    const filename = `${hostname}_${timestamp}.cfg`;
    const filepath = path.join(BACKUPS_DIR, filename);
    
    await fs.writeFile(filepath, config, 'utf8');
    
    io?.emit('log', {
      type: 'success',
      message: `Configuration saved: ${filename} (${config.length} bytes)`,
      timestamp: new Date().toISOString()
    });
    
    await telnet.end();
    
    return { filename, filepath, config, size: config.length, device_id: device.id, timestamp: new Date().toISOString() };
  } catch (error) {
    await telnet.end();
    io?.emit('log', {
      type: 'error',
      message: `Backup failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

async function restoreViaSSH(device, config, io) {
  const ssh = new NodeSSH();
  
  try {
    io?.emit('log', {
      type: 'info',
      message: `Establishing SSH connection to ${device.ip_address}:${device.port || 22}...`,
      timestamp: new Date().toISOString()
    });
    
    await ssh.connect({
      host: device.ip_address,
      port: device.port || 22,
      username: device.username,
      password: device.password,
      readyTimeout: 30000,
      tryKeyboard: true
    });
    
    io?.emit('log', {
      type: 'success',
      message: 'SSH connection established',
      timestamp: new Date().toISOString()
    });
    
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    io?.emit('log', {
      type: 'info',
      message: 'Entering configuration mode...',
      timestamp: new Date().toISOString()
    });
    
    await ssh.execCommand(commands.enterConfig);
    
    const lines = config.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.startsWith('!') && 
             !trimmed.startsWith('Building') &&
             !trimmed.startsWith('Current configuration') &&
             !trimmed.startsWith('Last configuration change') &&
             !trimmed.includes('NVRAM config last updated') &&
             !trimmed.match(/^version \d/);
    });
    
    io?.emit('log', {
      type: 'info',
      message: `Applying ${lines.length} configuration lines...`,
      timestamp: new Date().toISOString()
    });
    
    let output = '';
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (i % 20 === 0) {
        io?.emit('log', {
          type: 'info',
          message: `Progress: ${i}/${lines.length} lines (${successCount} ok, ${errorCount} errors)`,
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        const result = await ssh.execCommand(line);
        output += result.stdout + '\n';
        
        if (result.stderr && (result.stderr.includes('Invalid') || result.stderr.includes('Error'))) {
          errorCount++;
          errors.push({ line, error: result.stderr });
        } else {
          successCount++;
        }
        
        if (result.stderr && !result.stderr.includes('Invalid') && !result.stderr.includes('Error')) {
          output += result.stderr + '\n';
        }
      } catch (cmdError) {
        errorCount++;
        errors.push({ line, error: cmdError.message });
      }
    }
    
    io?.emit('log', {
      type: 'info',
      message: 'Saving configuration to device memory...',
      timestamp: new Date().toISOString()
    });
    
    await ssh.execCommand(commands.exitConfig);
    const saveResult = await ssh.execCommand(commands.saveConfig);
    output += '\n=== Save Result ===\n' + saveResult.stdout;
    
    io?.emit('log', {
      type: 'success',
      message: `Restore completed: ${successCount}/${lines.length} lines applied successfully`,
      timestamp: new Date().toISOString()
    });
    
    ssh.dispose();
    
    return { output, linesApplied: successCount, totalLines: lines.length, errorCount, errors: errors.slice(0, 10), success: errorCount < lines.length * 0.1 };
  } catch (error) {
    ssh.dispose();
    io?.emit('log', {
      type: 'error',
      message: `Restore failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

async function restoreViaTelnet(device, config, io) {
  const telnet = new Telnet();
  
  const params = {
    host: device.ip_address,
    port: device.port || 23,
    shellPrompt: /[$#>]$/,
    timeout: 30000,
    loginPrompt: /[Uu]sername:|[Ll]ogin:/,
    passwordPrompt: /[Pp]assword:/,
    username: device.username,
    password: device.password,
    irs: '\r\n',
    ors: '\n',
    echoLines: 1
  };
  
  try {
    await telnet.connect(params);
    
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    await telnet.send(commands.enterConfig);
    
    const lines = config.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('!') && !trimmed.startsWith('Building') && !trimmed.match(/^version \d/);
    });
    
    let output = '';
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      try {
        const result = await telnet.send(line);
        output += result + '\n';
        
        if (result.includes('Invalid') || result.includes('Error')) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch (cmdError) {
        errorCount++;
      }
    }
    
    await telnet.send(commands.exitConfig);
    const saveResult = await telnet.send(commands.saveConfig);
    output += '\n=== Save Result ===\n' + saveResult;
    
    await telnet.end();
    
    return { output, linesApplied: successCount, totalLines: lines.length, errorCount, success: errorCount < lines.length * 0.1 };
  } catch (error) {
    await telnet.end();
    throw error;
  }
}

async function backupDeviceConfig(device, io) {
  if (!device.ip_address) throw new Error('Device IP address is required');
  if (!device.username || !device.password) throw new Error('Device credentials are required');
  
  const protocol = device.protocol?.toLowerCase() || 'ssh';
  
  if (protocol === 'ssh') {
    return await backupViaSSH(device, io);
  } else if (protocol === 'telnet') {
    return await backupViaTelnet(device, io);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

async function restoreDeviceConfig(device, config, io) {
  if (!device.ip_address) throw new Error('Device IP address is required');
  if (!device.username || !device.password) throw new Error('Device credentials are required');
  if (!config || config.length < 50) throw new Error('Invalid configuration data');
  
  const protocol = device.protocol?.toLowerCase() || 'ssh';
  
  if (protocol === 'ssh') {
    return await restoreViaSSH(device, config, io);
  } else if (protocol === 'telnet') {
    return await restoreViaTelnet(device, config, io);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

async function testConnection(device, io) {
  const ssh = new NodeSSH();
  const protocol = device.protocol?.toLowerCase() || 'ssh';
  
  try {
    io?.emit('log', {
      type: 'info',
      message: `Testing ${protocol.toUpperCase()} connection to ${device.ip_address}...`,
      timestamp: new Date().toISOString()
    });
    
    if (protocol === 'ssh') {
      await ssh.connect({
        host: device.ip_address,
        port: device.port || 22,
        username: device.username,
        password: device.password,
        readyTimeout: 15000,
        tryKeyboard: true
      });
      
      ssh.dispose();
      
      io?.emit('log', {
        type: 'success',
        message: 'Connection test successful',
        timestamp: new Date().toISOString()
      });
      
      return { success: true, message: 'Connection successful' };
    }
  } catch (error) {
    ssh.dispose();
    return { success: false, message: error.message };
  }
}

module.exports = {
  backupDeviceConfig,
  restoreDeviceConfig,
  getDeviceInfo,
  testConnection
};
DEVICE_MANAGER_EOF

    success "device-manager.js created"
}

create_enhanced_backup_routes() {
    info "Creating enhanced backups.js routes..."
    
    cat > "$BACKEND_DIR/routes/backups.js" << 'BACKUPS_ROUTES_EOF'
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { backupDeviceConfig, restoreDeviceConfig } = require('../utils/device-manager');

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const backups = db.prepare(`
      SELECT b.*, d.hostname, d.ip_address, d.vendor
      FROM backups b
      LEFT JOIN devices d ON b.device_id = d.id
      ORDER BY b.created_at DESC
    `).all();
    
    res.json({ backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/files', async (req, res) => {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    
    const files = await fs.readdir(BACKUPS_DIR);
    
    const backupFiles = await Promise.all(
      files
        .filter(file => file.endsWith('.cfg') || file.endsWith('.txt'))
        .map(async (file) => {
          const filepath = path.join(BACKUPS_DIR, file);
          const stats = await fs.stat(filepath);
          
          return {
            filename: file,
            size: stats.size,
            created: stats.mtime,
            path: `/api/v1/backups/download/${encodeURIComponent(file)}`
          };
        })
    );
    
    backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ files: backupFiles });
  } catch (error) {
    console.error('Error listing backup files:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const backup = db.prepare(`
      SELECT b.*, d.hostname, d.ip_address, d.vendor
      FROM backups b
      LEFT JOIN devices d ON b.device_id = d.id
      WHERE b.id = ?
    `).get(id);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    if (backup.filename) {
      const filepath = path.join(BACKUPS_DIR, backup.filename);
      try {
        const config = await fs.readFile(filepath, 'utf8');
        backup.config = config;
      } catch (readError) {
        backup.config = null;
      }
    }
    
    res.json({ backup });
  } catch (error) {
    console.error('Error getting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/view/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUPS_DIR, filename);
    
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const config = await fs.readFile(filepath, 'utf8');
    
    res.json({ filename, config, size: config.length });
  } catch (error) {
    console.error('Error viewing backup:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUPS_DIR, filename);
    
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filepath, filename);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { device_id } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }
    
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    io.emit('log', {
      type: 'info',
      message: `Starting backup for ${device.hostname || device.ip_address}...`,
      timestamp: new Date().toISOString()
    });
    
    const result = await backupDeviceConfig(device, io);
    
    const insert = db.prepare(`
      INSERT INTO backups (device_id, filename, size, created_at, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = insert.run(
      device_id,
      result.filename,
      result.size,
      result.timestamp,
      'completed'
    );
    
    io.emit('log', {
      type: 'success',
      message: `Backup completed successfully for ${device.hostname || device.ip_address}`,
      timestamp: new Date().toISOString()
    });
    
    io.emit('backup-notification', {
      id: info.lastInsertRowid,
      device_id,
      hostname: device.hostname,
      filename: result.filename,
      status: 'completed',
      timestamp: result.timestamp
    });
    
    res.json({
      success: true,
      backup: {
        id: info.lastInsertRowid,
        device_id,
        filename: result.filename,
        size: result.size,
        created_at: result.timestamp
      }
    });
  } catch (error) {
    const io = req.app.get('io');
    
    console.error('Backup error:', error);
    
    io.emit('log', {
      type: 'error',
      message: `Backup failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ error: error.message, success: false });
  }
});

router.post('/restore', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { device_id, backup_id, filename } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }
    
    if (!backup_id && !filename) {
      return res.status(400).json({ error: 'backup_id or filename is required' });
    }
    
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    let config;
    let backupFilename;
    
    if (backup_id) {
      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backup_id);
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }
      backupFilename = backup.filename;
    } else {
      backupFilename = filename;
    }
    
    if (backupFilename.includes('..') || backupFilename.includes('/') || backupFilename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUPS_DIR, backupFilename);
    config = await fs.readFile(filepath, 'utf8');
    
    io.emit('log', {
      type: 'info',
      message: `Starting restore for ${device.hostname || device.ip_address} using ${backupFilename}...`,
      timestamp: new Date().toISOString()
    });
    
    const result = await restoreDeviceConfig(device, config, io);
    
    io.emit('log', {
      type: result.success ? 'success' : 'warning',
      message: `Restore completed: ${result.linesApplied}/${result.totalLines} lines applied`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: result.success,
      linesApplied: result.linesApplied,
      totalLines: result.totalLines,
      errorCount: result.errorCount,
      errors: result.errors,
      output: result.output
    });
  } catch (error) {
    const io = req.app.get('io');
    
    console.error('Restore error:', error);
    
    io.emit('log', {
      type: 'error',
      message: `Restore failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ error: error.message, success: false });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    if (backup.filename) {
      const filepath = path.join(BACKUPS_DIR, backup.filename);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.warn('Failed to delete backup file:', error.message);
      }
    }
    
    db.prepare('DELETE FROM backups WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
BACKUPS_ROUTES_EOF

    success "backups.js created"
}

create_database_migration() {
    info "Creating database migration script..."
    
    cat > "$BACKEND_DIR/database/migrate-v3.js" << 'MIGRATION_EOF'
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'velocity.db');
const db = new Database(dbPath);

console.log('Running v3.0 migrations...');

db.exec(`
  CREATE TABLE IF NOT EXISTS backup_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    schedule_time TEXT NOT NULL,
    days_of_week TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    last_run TEXT,
    next_run TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
  )
`);
console.log('✓ backup_schedules table ready');

db.exec(`
  CREATE TABLE IF NOT EXISTS topology_maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
console.log('✓ topology_maps table ready');

try {
  db.exec('ALTER TABLE backups ADD COLUMN status TEXT DEFAULT "completed"');
  console.log('✓ Added status column to backups');
} catch (e) {
  console.log('  Status column already exists');
}

try {
  db.exec('ALTER TABLE backups ADD COLUMN error TEXT');
  console.log('✓ Added error column to backups');
} catch (e) {
  console.log('  Error column already exists');
}

db.exec('CREATE INDEX IF NOT EXISTS idx_backups_device ON backups(device_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_schedules_device ON backup_schedules(device_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON backup_schedules(enabled)');
console.log('✓ Indexes created');

console.log('\nMigrations complete!');

db.close();
MIGRATION_EOF

    success "Migration script created"
}

#═══════════════════════════════════════════════════════════════════════════
# Installation Functions
#═══════════════════════════════════════════════════════════════════════════

install_nvm() {
    print_separator
    echo -e "${BOLD}Installing NVM (Node Version Manager)...${NC}"
    echo ""
    
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        success "NVM already installed"
        return 0
    fi
    
    info "Downloading and installing NVM..."
    
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        success "NVM installed successfully"
        return 0
    else
        error "Failed to install NVM"
        return 1
    fi
}

install_nodejs() {
    print_separator
    echo -e "${BOLD}Installing Node.js $REQUIRED_NODE_VERSION LTS...${NC}"
    echo ""
    
    local current_version=$(check_node_version)
    
    if [ "$current_version" -eq "$REQUIRED_NODE_VERSION" ]; then
        success "Node.js $REQUIRED_NODE_VERSION already installed"
        node --version
        return 0
    fi
    
    if ! [ -s "$HOME/.nvm/nvm.sh" ]; then
        install_nvm || return 1
    fi
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    info "Installing Node.js $REQUIRED_NODE_VERSION..."
    
    nvm install $REQUIRED_NODE_VERSION
    nvm use $REQUIRED_NODE_VERSION
    nvm alias default $REQUIRED_NODE_VERSION
    
    local new_version=$(check_node_version)
    if [ "$new_version" -eq "$REQUIRED_NODE_VERSION" ]; then
        success "Node.js $REQUIRED_NODE_VERSION installed successfully"
        node --version
        npm --version
        return 0
    else
        error "Failed to install Node.js $REQUIRED_NODE_VERSION"
        return 1
    fi
}

create_directory_structure() {
    print_separator
    echo -e "${BOLD}Creating Directory Structure...${NC}"
    echo ""
    
    mkdir -p "$BACKEND_DIR"/{routes,utils,database,data,backups}
    mkdir -p "$FRONTEND_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$PID_DIR"
    
    success "Directories created"
}

install_backend_dependencies() {
    print_separator
    echo -e "${BOLD}Installing Backend Dependencies...${NC}"
    echo ""
    
    cd "$BACKEND_DIR"
    
    if [ -d "node_modules" ]; then
        info "Cleaning previous installation..."
        rm -rf node_modules package-lock.json
    fi
    
    info "Running npm install..."
    npm install
    
    if [ $? -eq 0 ]; then
        success "Backend dependencies installed"
        cd "$INSTALL_DIR"
        return 0
    else
        error "Failed to install backend dependencies"
        cd "$INSTALL_DIR"
        return 1
    fi
}

install_frontend_dependencies() {
    print_separator
    echo -e "${BOLD}Installing Frontend Dependencies...${NC}"
    echo ""
    
    cd "$FRONTEND_DIR"
    
    if [ -d "node_modules" ]; then
        info "Cleaning previous installation..."
        rm -rf node_modules package-lock.json
    fi
    
    info "Running npm install..."
    npm install
    
    if [ $? -eq 0 ]; then
        success "Frontend dependencies installed"
        cd "$INSTALL_DIR"
        return 0
    else
        error "Failed to install frontend dependencies"
        cd "$INSTALL_DIR"
        return 1
    fi
}

full_install() {
    print_header
    echo -e "${BOLD}${MAGENTA}Starting Full Installation${NC}"
    print_separator
    
    # Create directories
    create_directory_structure
    
    # Install Node.js
    install_nodejs || {
        error "Node.js installation failed. Aborting."
        pause
        return 1
    }
    
    # Create enhanced files
    echo ""
    print_separator
    echo -e "${BOLD}Installing Enhanced Backend Files...${NC}"
    echo ""
    
    create_enhanced_device_manager
    create_enhanced_backup_routes
    create_database_migration
    
    # Install dependencies
    if [ -f "$BACKEND_DIR/package.json" ]; then
        install_backend_dependencies || {
            error "Backend installation failed."
            pause
            return 1
        }
    else
        warning "No backend/package.json found - skipping backend deps"
    fi
    
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        install_frontend_dependencies || {
            error "Frontend installation failed."
            pause
            return 1
        }
    else
        warning "No frontend/package.json found - skipping frontend deps"
    fi
    
    # Run migrations if database exists
    if [ -f "$DATA_DIR/velocity.db" ]; then
        echo ""
        print_separator
        echo -e "${BOLD}Running Database Migrations...${NC}"
        echo ""
        
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm use $REQUIRED_NODE_VERSION > /dev/null 2>&1
        
        cd "$BACKEND_DIR"
        node database/migrate-v3.js
        cd "$INSTALL_DIR"
        
        success "Migrations completed"
    fi
    
    print_separator
    echo ""
    success "Full installation completed successfully!"
    echo ""
    info "Next steps:"
    echo "  1. Start services: Choose option 5 from main menu"
    echo "  2. Access at: http://localhost:3000"
    echo ""
    
    pause
}

#═══════════════════════════════════════════════════════════════════════════
# Service Management
#═══════════════════════════════════════════════════════════════════════════

start_backend() {
    print_separator
    echo -e "${BOLD}Starting Backend...${NC}"
    echo ""
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            warning "Backend already running (PID: $pid)"
            return 0
        fi
    fi
    
    if check_port 8080; then
        warning "Port 8080 is in use"
        echo -n "Kill process and continue? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            kill_port 8080 || return 1
        else
            return 1
        fi
    fi
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use $REQUIRED_NODE_VERSION > /dev/null 2>&1
    
    cd "$BACKEND_DIR"
    
    nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/backend.pid"
    
    sleep 2
    if ps -p $pid > /dev/null 2>&1; then
        success "Backend started (PID: $pid)"
        info "Backend running on http://localhost:8080"
        cd "$INSTALL_DIR"
        return 0
    else
        error "Backend failed to start"
        cat "$LOG_DIR/backend.log"
        cd "$INSTALL_DIR"
        return 1
    fi
}

start_frontend() {
    print_separator
    echo -e "${BOLD}Starting Frontend...${NC}"
    echo ""
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            warning "Frontend already running (PID: $pid)"
            return 0
        fi
    fi
    
    if check_port 3000; then
        warning "Port 3000 is in use"
        echo -n "Kill process and continue? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            kill_port 3000 || return 1
        else
            return 1
        fi
    fi
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use $REQUIRED_NODE_VERSION > /dev/null 2>&1
    
    cd "$FRONTEND_DIR"
    
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/frontend.pid"
    
    sleep 3
    if ps -p $pid > /dev/null 2>&1; then
        success "Frontend started (PID: $pid)"
        info "Frontend running on http://localhost:3000"
        cd "$INSTALL_DIR"
        return 0
    else
        error "Frontend failed to start"
        cat "$LOG_DIR/frontend.log"
        cd "$INSTALL_DIR"
        return 1
    fi
}

stop_backend() {
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            rm "$PID_DIR/backend.pid"
            success "Backend stopped"
        else
            rm "$PID_DIR/backend.pid"
        fi
    fi
    
    if check_port 8080; then
        kill_port 8080
    fi
}

stop_frontend() {
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            rm "$PID_DIR/frontend.pid"
            success "Frontend stopped"
        else
            rm "$PID_DIR/frontend.pid"
        fi
    fi
    
    if check_port 3000; then
        kill_port 3000
    fi
}

start_all() {
    print_header
    echo -e "${BOLD}${GREEN}Starting All Services${NC}"
    
    start_backend
    echo ""
    start_frontend
    
    print_separator
    echo ""
    success "All services started!"
    echo ""
    info "Access: http://localhost:3000"
    echo ""
    
    pause
}

stop_all() {
    print_header
    echo -e "${BOLD}${RED}Stopping All Services${NC}"
    print_separator
    echo ""
    
    stop_backend
    stop_frontend
    
    echo ""
    success "All services stopped!"
    echo ""
    
    pause
}

show_status() {
    print_header
    echo -e "${BOLD}System Status${NC}"
    print_separator
    echo ""
    
    echo -e "${BOLD}Node.js:${NC}"
    if command -v node &> /dev/null; then
        success "Installed: $(node --version)"
        success "npm: $(npm --version)"
    else
        error "Not installed"
    fi
    
    echo ""
    echo -e "${BOLD}Backend:${NC}"
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            success "Running (PID: $pid)"
            if check_port 8080; then
                success "Port 8080: LISTENING"
            fi
        else
            error "Not running"
        fi
    else
        error "Not running"
    fi
    
    echo ""
    echo -e "${BOLD}Frontend:${NC}"
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            success "Running (PID: $pid)"
            if check_port 3000; then
                success "Port 3000: LISTENING"
            fi
        else
            error "Not running"
        fi
    else
        error "Not running"
    fi
    
    echo ""
    print_separator
    
    pause
}

view_logs() {
    print_header
    echo -e "${BOLD}View Logs${NC}"
    print_separator
    echo ""
    echo "1. Backend Log"
    echo "2. Frontend Log"
    echo "3. Both Logs"
    echo "4. Back"
    echo ""
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            if [ -f "$LOG_DIR/backend.log" ]; then
                print_header
                echo -e "${BOLD}Backend Log (Last 50 lines)${NC}"
                print_separator
                tail -n 50 "$LOG_DIR/backend.log"
                pause
            else
                error "No backend log found"
                pause
            fi
            ;;
        2)
            if [ -f "$LOG_DIR/frontend.log" ]; then
                print_header
                echo -e "${BOLD}Frontend Log (Last 50 lines)${NC}"
                print_separator
                tail -n 50 "$LOG_DIR/frontend.log"
                pause
            else
                error "No frontend log found"
                pause
            fi
            ;;
        3)
            print_header
            echo -e "${BOLD}Backend Log${NC}"
            print_separator
            if [ -f "$LOG_DIR/backend.log" ]; then
                tail -n 25 "$LOG_DIR/backend.log"
            else
                echo "No backend log"
            fi
            echo ""
            echo -e "${BOLD}Frontend Log${NC}"
            print_separator
            if [ -f "$LOG_DIR/frontend.log" ]; then
                tail -n 25 "$LOG_DIR/frontend.log"
            else
                echo "No frontend log"
            fi
            pause
            ;;
        4)
            return
            ;;
    esac
}

#═══════════════════════════════════════════════════════════════════════════
# Uninstall
#═══════════════════════════════════════════════════════════════════════════

uninstall_all() {
    print_header
    echo -e "${BOLD}${RED}Complete Uninstall${NC}"
    print_separator
    echo ""
    error "WARNING: This will remove:"
    echo "  - All dependencies (node_modules)"
    echo "  - All logs"
    echo "  - All PID files"
    echo "  - Enhanced backend files"
    echo ""
    warning "Node.js/NVM will NOT be removed"
    warning "Database and backups will NOT be removed"
    echo ""
    echo -n "Type 'yes' to confirm: "
    read -r response
    
    if [[ "$response" != "yes" ]]; then
        info "Uninstall cancelled"
        pause
        return
    fi
    
    echo ""
    
    stop_backend
    stop_frontend
    
    echo ""
    print_separator
    
    if [ -d "$BACKEND_DIR/node_modules" ]; then
        info "Removing backend dependencies..."
        rm -rf "$BACKEND_DIR/node_modules" "$BACKEND_DIR/package-lock.json"
        success "Backend dependencies removed"
    fi
    
    if [ -d "$FRONTEND_DIR/node_modules" ]; then
        info "Removing frontend dependencies..."
        rm -rf "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/package-lock.json"
        success "Frontend dependencies removed"
    fi
    
    if [ -d "$LOG_DIR" ]; then
        info "Removing logs..."
        rm -rf "$LOG_DIR"
        success "Logs removed"
    fi
    
    if [ -d "$PID_DIR" ]; then
        info "Removing PID files..."
        rm -rf "$PID_DIR"
        success "PID files removed"
    fi
    
    echo ""
    success "Uninstall complete!"
    echo ""
    info "Database preserved at: $DATA_DIR/velocity.db"
    info "Backups preserved at: $BACKUPS_DIR"
    echo ""
    
    pause
}

#═══════════════════════════════════════════════════════════════════════════
# Main Menu
#═══════════════════════════════════════════════════════════════════════════

show_menu() {
    print_header
    
    local node_status="${RED}✗${NC}"
    local backend_status="${RED}✗${NC}"
    local frontend_status="${RED}✗${NC}"
    
    if command -v node &> /dev/null; then
        local version=$(check_node_version)
        if [ "$version" -eq "$REQUIRED_NODE_VERSION" ]; then
            node_status="${GREEN}✓${NC}"
        else
            node_status="${YELLOW}⚠${NC}"
        fi
    fi
    
    if [ -f "$PID_DIR/backend.pid" ] && ps -p $(cat "$PID_DIR/backend.pid" 2>/dev/null) > /dev/null 2>&1; then
        backend_status="${GREEN}✓${NC}"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ] && ps -p $(cat "$PID_DIR/frontend.pid" 2>/dev/null) > /dev/null 2>&1; then
        frontend_status="${GREEN}✓${NC}"
    fi
    
    echo -e "Node.js 20: $node_status  |  Backend: $backend_status  |  Frontend: $frontend_status"
    print_separator
    echo ""
    echo -e "${BOLD}${CYAN}Installation:${NC}"
    echo "  1. Full Install (Node.js + Backend + Frontend + Enhanced Files)"
    echo "  2. Install Enhanced Backend Files Only"
    echo "  3. Install Node.js 20 LTS Only"
    echo ""
    echo -e "${BOLD}${CYAN}Service Management:${NC}"
    echo "  4. Start All Services"
    echo "  5. Stop All Services"
    echo "  6. Restart All Services"
    echo "  7. Start Backend Only"
    echo "  8. Start Frontend Only"
    echo ""
    echo -e "${BOLD}${CYAN}Monitoring:${NC}"
    echo "  9. Show Status"
    echo "  10. View Logs"
    echo ""
    echo -e "${BOLD}${CYAN}Maintenance:${NC}"
    echo "  11. Run Database Migrations"
    echo "  12. Uninstall Everything"
    echo ""
    echo "  0. Exit"
    echo ""
    print_separator
    echo -n "Select option: "
}

#═══════════════════════════════════════════════════════════════════════════
# Main Program
#═══════════════════════════════════════════════════════════════════════════

main() {
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                full_install
                ;;
            2)
                print_header
                echo -e "${BOLD}Installing Enhanced Backend Files${NC}"
                print_separator
                echo ""
                create_enhanced_device_manager
                create_enhanced_backup_routes
                create_database_migration
                echo ""
                success "Enhanced files installed!"
                pause
                ;;
            3)
                print_header
                install_nodejs
                pause
                ;;
            4)
                start_all
                ;;
            5)
                print_header
                echo -e "${BOLD}${RED}Stopping All Services${NC}"
                print_separator
                echo ""
                stop_backend
                stop_frontend
                echo ""
                success "All services stopped!"
                pause
                ;;
            6)
                print_header
                echo -e "${BOLD}${YELLOW}Restarting Services${NC}"
                print_separator
                echo ""
                stop_backend
                stop_frontend
                sleep 2
                start_backend
                echo ""
                start_frontend
                echo ""
                success "Services restarted!"
                pause
                ;;
            7)
                print_header
                start_backend
                pause
                ;;
            8)
                print_header
                start_frontend
                pause
                ;;
            9)
                show_status
                ;;
            10)
                view_logs
                ;;
            11)
                print_header
                echo -e "${BOLD}Running Database Migrations${NC}"
                print_separator
                echo ""
                
                if [ ! -f "$DATA_DIR/velocity.db" ]; then
                    error "No database found at $DATA_DIR/velocity.db"
                    pause
                    continue
                fi
                
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm use $REQUIRED_NODE_VERSION > /dev/null 2>&1
                
                cd "$BACKEND_DIR"
                node database/migrate-v3.js
                cd "$INSTALL_DIR"
                
                echo ""
                pause
                ;;
            12)
                uninstall_all
                ;;
            0)
                print_header
                echo ""
                info "Thank you for using $APP_NAME!"
                echo ""
                exit 0
                ;;
            *)
                error "Invalid option"
                sleep 1
                ;;
        esac
    done
}

# Run main program
main
