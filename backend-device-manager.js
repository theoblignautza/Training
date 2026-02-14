const { NodeSSH } = require('node-ssh');
const Telnet = require('telnet-client');
const path = require('path');
const fs = require('fs').promises;

// Ensure backups directory exists
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
fs.mkdir(BACKUPS_DIR, { recursive: true }).catch(console.error);

/**
 * Multi-vendor configuration commands
 */
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

/**
 * Detect device vendor from banner or prompt
 */
function detectVendor(banner, prompt) {
  const text = (banner + ' ' + prompt).toLowerCase();
  
  if (text.includes('cisco') || text.includes('ios')) return 'cisco';
  if (text.includes('ubiquiti') || text.includes('edgerouter') || text.includes('unifi')) return 'ubiquiti';
  if (text.includes('aruba') || text.includes('arubaos')) return 'aruba';
  
  return 'generic';
}

/**
 * Get device information via SSH
 */
async function getDeviceInfo(device, io) {
  const ssh = new NodeSSH();
  
  try {
    io?.emit('log', {
      type: 'info',
      message: `Connecting to ${device.ip_address}:${device.port} to gather info...`,
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
    
    // Get hostname
    const hostnameResult = await ssh.execCommand('hostname');
    const hostname = hostnameResult.stdout.trim() || device.hostname || device.ip_address;
    
    // Get version info to detect vendor
    const versionResult = await ssh.execCommand('show version');
    const versionText = versionResult.stdout;
    
    // Detect vendor
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
    
    return {
      hostname,
      vendor,
      model,
      ip_address: device.ip_address
    };
  } catch (error) {
    ssh.dispose();
    throw new Error(`Failed to get device info: ${error.message}`);
  }
}

/**
 * Backup device configuration via SSH
 */
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
    
    // Detect vendor from device or use default
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    // Disable paging
    if (commands.disablePaging) {
      await ssh.execCommand(commands.disablePaging);
    }
    
    // Get running config
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
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const hostname = device.hostname || device.ip_address.replace(/\./g, '_');
    const filename = `${hostname}_${timestamp}.cfg`;
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Save config to file
    await fs.writeFile(filepath, config, 'utf8');
    
    io?.emit('log', {
      type: 'success',
      message: `Configuration saved: ${filename} (${config.length} bytes)`,
      timestamp: new Date().toISOString()
    });
    
    ssh.dispose();
    
    return { 
      filename, 
      filepath, 
      config,
      size: config.length,
      device_id: device.id,
      timestamp: new Date().toISOString()
    };
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

/**
 * Backup device configuration via Telnet
 */
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
    
    // Detect vendor
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    // Disable paging
    if (commands.disablePaging) {
      io?.emit('log', {
        type: 'info',
        message: 'Disabling pagination...',
        timestamp: new Date().toISOString()
      });
      
      await telnet.send(commands.disablePaging);
    }
    
    // Get running config
    io?.emit('log', {
      type: 'info',
      message: `Executing: ${commands.showConfig}`,
      timestamp: new Date().toISOString()
    });
    
    const config = await telnet.send(commands.showConfig);
    
    if (!config || config.length < 50) {
      throw new Error('Configuration appears to be empty or invalid');
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const hostname = device.hostname || device.ip_address.replace(/\./g, '_');
    const filename = `${hostname}_${timestamp}.cfg`;
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Save config to file
    await fs.writeFile(filepath, config, 'utf8');
    
    io?.emit('log', {
      type: 'success',
      message: `Configuration saved: ${filename} (${config.length} bytes)`,
      timestamp: new Date().toISOString()
    });
    
    await telnet.end();
    
    return { 
      filename, 
      filepath, 
      config,
      size: config.length,
      device_id: device.id,
      timestamp: new Date().toISOString()
    };
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

/**
 * Restore device configuration via SSH
 */
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
    
    // Get vendor-specific commands
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    // Enter configuration mode
    io?.emit('log', {
      type: 'info',
      message: 'Entering configuration mode...',
      timestamp: new Date().toISOString()
    });
    
    await ssh.execCommand(commands.enterConfig);
    
    // Parse and clean configuration
    const lines = config.split('\n').filter(line => {
      const trimmed = line.trim();
      // Skip comments, blank lines, and informational headers
      return trimmed && 
             !trimmed.startsWith('!') && 
             !trimmed.startsWith('Building') &&
             !trimmed.startsWith('Current configuration') &&
             !trimmed.startsWith('Last configuration change') &&
             !trimmed.includes('NVRAM config last updated') &&
             !trimmed.match(/^version \d/); // Skip version lines
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
    
    // Apply configuration line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Progress update every 20 lines
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
        
        // Check for errors in output
        if (result.stderr && (result.stderr.includes('Invalid') || result.stderr.includes('Error'))) {
          errorCount++;
          errors.push({ line, error: result.stderr });
          io?.emit('log', {
            type: 'warning',
            message: `Line ${i + 1} warning: ${result.stderr.substring(0, 100)}`,
            timestamp: new Date().toISOString()
          });
        } else {
          successCount++;
        }
        
        if (result.stderr && !result.stderr.includes('Invalid') && !result.stderr.includes('Error')) {
          output += result.stderr + '\n';
        }
      } catch (cmdError) {
        errorCount++;
        errors.push({ line, error: cmdError.message });
        io?.emit('log', {
          type: 'warning',
          message: `Line ${i + 1} failed: ${line}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Exit configuration mode
    io?.emit('log', {
      type: 'info',
      message: 'Exiting configuration mode...',
      timestamp: new Date().toISOString()
    });
    
    await ssh.execCommand(commands.exitConfig);
    
    // Save configuration
    io?.emit('log', {
      type: 'info',
      message: 'Saving configuration to device memory...',
      timestamp: new Date().toISOString()
    });
    
    const saveResult = await ssh.execCommand(commands.saveConfig);
    output += '\n=== Save Result ===\n' + saveResult.stdout;
    
    if (saveResult.stdout.includes('OK') || saveResult.stdout.includes('[OK]') || saveResult.stdout.includes('Complete')) {
      io?.emit('log', {
        type: 'success',
        message: `Restore completed: ${successCount}/${lines.length} lines applied successfully`,
        timestamp: new Date().toISOString()
      });
    } else {
      io?.emit('log', {
        type: 'warning',
        message: `Restore completed with warnings: ${successCount}/${lines.length} lines applied, ${errorCount} errors`,
        timestamp: new Date().toISOString()
      });
    }
    
    ssh.dispose();
    
    return { 
      output, 
      linesApplied: successCount, 
      totalLines: lines.length,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      success: errorCount < lines.length * 0.1 // Success if < 10% errors
    };
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

/**
 * Restore device configuration via Telnet
 */
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
    
    // Get vendor-specific commands
    const vendorKey = device.vendor?.toLowerCase() || 'generic';
    const commands = VENDOR_COMMANDS[vendorKey] || VENDOR_COMMANDS.generic;
    
    // Enter configuration mode
    io?.emit('log', {
      type: 'info',
      message: 'Entering configuration mode...',
      timestamp: new Date().toISOString()
    });
    
    await telnet.send(commands.enterConfig);
    
    // Parse configuration
    const lines = config.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.startsWith('!') && 
             !trimmed.startsWith('Building') &&
             !trimmed.startsWith('Current configuration') &&
             !trimmed.startsWith('Last configuration change') &&
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
        const result = await telnet.send(line);
        output += result + '\n';
        
        if (result.includes('Invalid') || result.includes('Error')) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch (cmdError) {
        errorCount++;
        io?.emit('log', {
          type: 'warning',
          message: `Failed to apply line ${i + 1}: ${line}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Exit and save
    io?.emit('log', {
      type: 'info',
      message: 'Saving configuration...',
      timestamp: new Date().toISOString()
    });
    
    await telnet.send(commands.exitConfig);
    const saveResult = await telnet.send(commands.saveConfig);
    output += '\n=== Save Result ===\n' + saveResult;
    
    io?.emit('log', {
      type: 'success',
      message: `Restore completed: ${successCount}/${lines.length} lines applied`,
      timestamp: new Date().toISOString()
    });
    
    await telnet.end();
    
    return { 
      output, 
      linesApplied: successCount, 
      totalLines: lines.length,
      errorCount,
      success: errorCount < lines.length * 0.1
    };
  } catch (error) {
    await telnet.end();
    io?.emit('log', {
      type: 'error',
      message: `Restore failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Main backup function - routes to SSH or Telnet based on protocol
 */
async function backupDeviceConfig(device, io) {
  if (!device.ip_address) {
    throw new Error('Device IP address is required');
  }
  
  if (!device.username || !device.password) {
    throw new Error('Device credentials are required');
  }
  
  const protocol = device.protocol?.toLowerCase() || 'ssh';
  
  if (protocol === 'ssh') {
    return await backupViaSSH(device, io);
  } else if (protocol === 'telnet') {
    return await backupViaTelnet(device, io);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

/**
 * Main restore function - routes to SSH or Telnet based on protocol
 */
async function restoreDeviceConfig(device, config, io) {
  if (!device.ip_address) {
    throw new Error('Device IP address is required');
  }
  
  if (!device.username || !device.password) {
    throw new Error('Device credentials are required');
  }
  
  if (!config || config.length < 50) {
    throw new Error('Invalid configuration data');
  }
  
  const protocol = device.protocol?.toLowerCase() || 'ssh';
  
  if (protocol === 'ssh') {
    return await restoreViaSSH(device, config, io);
  } else if (protocol === 'telnet') {
    return await restoreViaTelnet(device, config, io);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

/**
 * Test device connectivity
 */
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
    } else if (protocol === 'telnet') {
      const telnet = new Telnet();
      
      await telnet.connect({
        host: device.ip_address,
        port: device.port || 23,
        timeout: 15000,
        username: device.username,
        password: device.password
      });
      
      await telnet.end();
      
      io?.emit('log', {
        type: 'success',
        message: 'Connection test successful',
        timestamp: new Date().toISOString()
      });
      
      return { success: true, message: 'Connection successful' };
    }
  } catch (error) {
    ssh.dispose();
    
    io?.emit('log', {
      type: 'error',
      message: `Connection test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    return { success: false, message: error.message };
  }
}

module.exports = {
  backupDeviceConfig,
  restoreDeviceConfig,
  getDeviceInfo,
  testConnection
};
