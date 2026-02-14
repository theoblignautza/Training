const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');

const execAsync = promisify(exec);

/**
 * Check if a port is open on a host
 */
function checkPort(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      cleanup();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      cleanup();
      resolve(false);
    });
    
    socket.on('error', () => {
      cleanup();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

/**
 * Parse subnet CIDR notation
 */
function parseSubnet(subnet) {
  const [network, bits] = subnet.split('/');
  const parts = network.split('.').map(Number);
  
  if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
    throw new Error('Invalid subnet format');
  }
  
  const maskBits = parseInt(bits, 10);
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) {
    throw new Error('Invalid CIDR bits');
  }
  
  return { network: parts, maskBits };
}

/**
 * Generate all IP addresses in a subnet
 */
function generateIPsInSubnet(subnet) {
  const { network, maskBits } = parseSubnet(subnet);
  
  // Calculate number of hosts
  const hostBits = 32 - maskBits;
  const numHosts = Math.pow(2, hostBits);
  
  // Limit to reasonable size (max /22 = 1024 hosts)
  if (numHosts > 1024) {
    throw new Error('Subnet too large. Maximum /22 allowed (1024 hosts)');
  }
  
  const ips = [];
  const baseIP = (network[0] << 24) | (network[1] << 16) | (network[2] << 8) | network[3];
  const mask = (0xFFFFFFFF << hostBits) >>> 0;
  const networkBase = (baseIP & mask) >>> 0;
  
  // Generate all IPs (excluding network and broadcast)
  for (let i = 1; i < numHosts - 1; i++) {
    const ip = (networkBase + i) >>> 0;
    const a = (ip >>> 24) & 0xFF;
    const b = (ip >>> 16) & 0xFF;
    const c = (ip >>> 8) & 0xFF;
    const d = ip & 0xFF;
    ips.push(`${a}.${b}.${c}.${d}`);
  }
  
  return ips;
}

/**
 * Try to get hostname via reverse DNS
 */
async function getHostname(ip) {
  try {
    const { stdout } = await execAsync(`nslookup ${ip}`);
    const match = stdout.match(/name\s*=\s*([^\s]+)/i);
    return match ? match[1].replace(/\.$/, '') : ip;
  } catch {
    return ip;
  }
}

/**
 * Scan a single host for open SSH/Telnet ports
 */
async function scanHost(ip, io) {
  const results = {
    ip,
    hostname: null,
    ssh: false,
    telnet: false,
    reachable: false
  };
  
  try {
    // Check SSH (port 22)
    const sshOpen = await checkPort(ip, 22, 2000);
    if (sshOpen) {
      results.ssh = true;
      results.reachable = true;
    }
    
    // Check Telnet (port 23)
    const telnetOpen = await checkPort(ip, 23, 2000);
    if (telnetOpen) {
      results.telnet = true;
      results.reachable = true;
    }
    
    // If either port is open, try to get hostname
    if (results.reachable) {
      results.hostname = await getHostname(ip);
      
      io.emit('log', {
        type: 'success',
        message: `Found device: ${results.hostname} (${ip}) - SSH: ${sshOpen ? '✓' : '✗'}, Telnet: ${telnetOpen ? '✓' : '✗'}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Silently ignore errors for individual hosts
  }
  
  return results;
}

/**
 * Scan subnet for devices with SSH/Telnet ports open
 */
async function discoverDevices(subnet, timeout = 5000, io) {
  try {
    io.emit('log', {
      type: 'info',
      message: `Starting network scan of ${subnet}`,
      timestamp: new Date().toISOString()
    });
    
    // Generate list of IPs to scan
    const ips = generateIPsInSubnet(subnet);
    
    io.emit('log', {
      type: 'info',
      message: `Scanning ${ips.length} IP addresses...`,
      timestamp: new Date().toISOString()
    });
    
    // Scan all hosts in parallel (with concurrency limit)
    const concurrency = 50; // Scan 50 hosts at a time
    const devices = [];
    
    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(ip => scanHost(ip, io))
      );
      
      // Filter for reachable devices
      const reachable = batchResults.filter(r => r.reachable);
      devices.push(...reachable);
      
      // Update progress
      const progress = Math.min(i + concurrency, ips.length);
      io.emit('log', {
        type: 'info',
        message: `Progress: ${progress}/${ips.length} IPs scanned (${devices.length} devices found)`,
        timestamp: new Date().toISOString()
      });
    }
    
    io.emit('log', {
      type: 'success',
      message: `Scan complete: Found ${devices.length} devices on ${subnet}`,
      timestamp: new Date().toISOString()
    });
    
    return devices.map(d => ({
      IPAddress: d.ip,
      Hostname: d.hostname || d.ip,
      SSHAvailable: d.ssh,
      TelnetAvailable: d.telnet,
      SuggestedProtocol: d.ssh ? 'ssh' : 'telnet',
      SuggestedPort: d.ssh ? 22 : 23
    }));
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `Scan failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Get current machine's subnet
 */
async function detectLocalSubnet() {
  try {
    const { stdout } = await execAsync('ip route | grep default');
    const match = stdout.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      const ip = match[1];
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  } catch {
    // Fallback
  }
  
  return '192.168.1.0/24';
}

module.exports = {
  discoverDevices,
  detectLocalSubnet,
  checkPort,
  scanHost,
  parseSubnet,
  generateIPsInSubnet
};
