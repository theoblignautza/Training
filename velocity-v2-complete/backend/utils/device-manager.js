const { NodeSSH } = require('node-ssh');
const Telnet = require('telnet-client');
const path = require('path');
const fs = require('fs').promises;

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
fs.mkdir(BACKUPS_DIR, { recursive: true }).catch(console.error);

const BACKUP_COMMANDS = {
  cisco: ['terminal length 0', 'show running-config'],
  ubiquiti: ['show configuration commands', 'cat /config/config.boot'],
  aruba: ['no paging', 'show running-config']
};

function getVendor(device) {
  const vendor = (device.vendor || '').toLowerCase();
  if (vendor.includes('ubiquiti')) return 'ubiquiti';
  if (vendor.includes('aruba')) return 'aruba';
  return 'cisco';
}

async function runCommandList(ssh, commands) {
  const outputs = [];
  for (const command of commands) {
    const result = await ssh.execCommand(command);
    if (result.stdout) outputs.push(result.stdout.trim());
  }
  return outputs.join('\n').trim();
}

function normalizeConfig(config) {
  return config
    .split('\n')
    .map((line) => line.replace(/\r/g, ''))
    .filter((line) => !line.includes('--More--'))
    .join('\n')
    .trim();
}

async function backupViaSSH(device, io) {
  const ssh = new NodeSSH();
  const vendor = getVendor(device);

  try {
    io.emit('log', { type: 'info', message: `Establishing SSH connection to ${device.username}@${device.ip_address}:${device.port}...`, timestamp: new Date().toISOString() });

    await ssh.connect({
      host: device.ip_address,
      port: device.port,
      username: device.username,
      password: device.password,
      readyTimeout: 30000,
      tryKeyboard: true
    });

    io.emit('log', { type: 'success', message: 'SSH connection established', timestamp: new Date().toISOString() });

    const preferredCommands = BACKUP_COMMANDS[vendor] || BACKUP_COMMANDS.cisco;
    let config = '';

    for (const command of preferredCommands) {
      try {
        const result = await ssh.execCommand(command);
        if (result.stdout?.trim()) {
          config = `${config}\n${result.stdout}`.trim();
        }
      } catch {
      }
    }

    if (!config) {
      config = await runCommandList(ssh, ['show running-config', 'show configuration']);
    }

    config = normalizeConfig(config);

    if (!config) {
      throw new Error('No configuration output captured from device');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${device.hostname}_${timestamp}.txt`;
    const filepath = path.join(BACKUPS_DIR, filename);

    await fs.writeFile(filepath, config, 'utf8');
    io.emit('log', { type: 'success', message: `Configuration saved: ${filename}`, timestamp: new Date().toISOString() });

    return { filename, filepath, config };
  } finally {
    ssh.dispose();
  }
}

async function backupViaTelnet(device, io) {
  const telnet = new Telnet();

  const params = {
    host: device.ip_address,
    port: device.port,
    shellPrompt: /[$#>]$/,
    timeout: 30000,
    loginPrompt: /[Uu]sername:|[Ll]ogin:/,
    passwordPrompt: /[Pp]assword:/,
    username: device.username,
    password: device.password,
    irs: '\r\n',
    ors: '\n',
    echoLines: 0
  };

  try {
    io.emit('log', { type: 'info', message: `Establishing Telnet connection to ${device.username}@${device.ip_address}:${device.port}...`, timestamp: new Date().toISOString() });
    await telnet.connect(params);
    await telnet.send('terminal length 0').catch(() => {});
    const config = normalizeConfig(await telnet.send('show running-config'));

    if (!config) throw new Error('No configuration output captured from telnet device');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${device.hostname}_${timestamp}.txt`;
    const filepath = path.join(BACKUPS_DIR, filename);

    await fs.writeFile(filepath, config, 'utf8');
    io.emit('log', { type: 'success', message: `Configuration saved: ${filename}`, timestamp: new Date().toISOString() });

    return { filename, filepath, config };
  } finally {
    await telnet.end().catch(() => {});
  }
}

function parseConfigLines(config) {
  return config
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('!') && !line.startsWith('#') && !line.startsWith('Building') && !line.startsWith('Current configuration'));
}

async function restoreViaSSH(device, config, io) {
  const ssh = new NodeSSH();
  const vendor = getVendor(device);
  const lines = parseConfigLines(config);

  try {
    await ssh.connect({
      host: device.ip_address,
      port: device.port,
      username: device.username,
      password: device.password,
      readyTimeout: 30000,
      tryKeyboard: true
    });

    io.emit('log', { type: 'info', message: `Applying ${lines.length} lines to ${device.hostname}...`, timestamp: new Date().toISOString() });

    const script = ['configure terminal', ...lines, 'end'];
    const applyResult = await ssh.execCommand(script.join('\n'));

    const saveCommands = vendor === 'cisco' ? ['write memory', 'copy running-config startup-config'] : ['write memory'];
    let saveOutput = '';

    for (const command of saveCommands) {
      const result = await ssh.execCommand(command);
      saveOutput += `\n${result.stdout || result.stderr || ''}`;
      if (result.stdout && !result.stderr) break;
    }

    io.emit('log', { type: 'success', message: 'Restore completed and save operation attempted', timestamp: new Date().toISOString() });

    return {
      output: `${applyResult.stdout || ''}\n${applyResult.stderr || ''}\n${saveOutput}`.trim(),
      linesApplied: lines.length,
      totalLines: lines.length
    };
  } finally {
    ssh.dispose();
  }
}

async function restoreViaTelnet(device, config, io) {
  const telnet = new Telnet();
  const lines = parseConfigLines(config);

  const params = {
    host: device.ip_address,
    port: device.port,
    shellPrompt: /[$#>]$/,
    timeout: 30000,
    loginPrompt: /[Uu]sername:|[Ll]ogin:/,
    passwordPrompt: /[Pp]assword:/,
    username: device.username,
    password: device.password,
    irs: '\r\n',
    ors: '\n',
    echoLines: 0
  };

  try {
    await telnet.connect(params);
    await telnet.send('configure terminal');

    for (const line of lines) {
      await telnet.send(line).catch(() => {});
    }

    await telnet.send('end');
    const saveResult = await telnet.send('write memory').catch(() => 'save skipped');

    io.emit('log', { type: 'success', message: 'Restore completed via telnet', timestamp: new Date().toISOString() });

    return { output: saveResult, linesApplied: lines.length, totalLines: lines.length };
  } finally {
    await telnet.end().catch(() => {});
  }
}

async function backupDeviceConfig(device, io) {
  if (device.protocol === 'ssh') return backupViaSSH(device, io);
  if (device.protocol === 'telnet') return backupViaTelnet(device, io);
  throw new Error(`Unsupported protocol: ${device.protocol}`);
}

async function restoreDeviceConfig(device, config, io) {
  if (device.protocol === 'ssh') return restoreViaSSH(device, config, io);
  if (device.protocol === 'telnet') return restoreViaTelnet(device, config, io);
  throw new Error(`Unsupported protocol: ${device.protocol}`);
}

module.exports = { backupDeviceConfig, restoreDeviceConfig };
