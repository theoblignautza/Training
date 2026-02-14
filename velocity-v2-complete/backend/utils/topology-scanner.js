const { scanHost, parseSubnet, generateIPsInSubnet } = require('./network-scanner');

async function scanTopology(subnet, db, io, sessionId, onProgress) {
  try {
    io.emit('log', {
      type: 'info',
      message: `Scanning topology for ${subnet}`,
      timestamp: new Date().toISOString()
    });

    const ips = generateIPsInSubnet(subnet);
    const devices = [];
    const concurrency = 25;

    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((ip) => scanHost(ip, io)));

      for (const result of batchResults) {
        if (result.reachable) {
          devices.push(result);
          const discoveredTopology = buildTopologyGraph(devices, subnet);
          io.emit('topology-discovered-device', {
            sessionId,
            subnet,
            topology: discoveredTopology,
            discoveredDevice: result,
            timestamp: new Date().toISOString()
          });
        }
      }

      const progress = Math.min(i + concurrency, ips.length);
      onProgress?.({ progress, total: ips.length, devicesFound: devices.length });
      io.emit('topology-progress', {
        sessionId,
        progress,
        total: ips.length,
        devicesFound: devices.length,
        timestamp: new Date().toISOString()
      });
    }

    const topology = buildTopologyGraph(devices, subnet);

    io.emit('log', {
      type: 'success',
      message: `Topology scan complete: Found ${devices.length} devices in ${subnet}`,
      timestamp: new Date().toISOString()
    });

    return topology;
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `Topology scan error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

function buildTopologyGraph(devices, subnet) {
  const subnetInfo = parseSubnet(subnet);
  const subnetPrefix = `${subnetInfo.network[0]}.${subnetInfo.network[1]}.${subnetInfo.network[2]}`;

  const nodes = devices.map((device, index) => {
    const octet = Number(device.ip.split('.').pop() || index + 1);
    return {
      id: device.ip,
      type: 'default',
      position: {
        x: ((index % 7) * 220) + 80,
        y: Math.floor(index / 7) * 160 + 80
      },
      data: {
        label: device.hostname || device.ip,
        hostname: device.hostname || device.ip,
        ip: device.ip,
        ssh: device.ssh,
        telnet: device.telnet,
        z: (octet % 7) * 40,
        vendor: 'unknown',
        model: 'unknown',
        subnet,
        subnetPrefix,
        deviceType: determineDeviceType(device)
      }
    };
  });

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${nodes[i].id}-${nodes[i + 1].id}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'smoothstep'
    });
  }

  return {
    nodes,
    edges,
    subnet,
    subnetPrefix,
    deviceCount: devices.length,
    scannedAt: new Date().toISOString()
  };
}

function determineDeviceType(device) {
  if (device.ssh && device.telnet) return 'router';
  if (device.ssh) return 'switch';
  if (device.telnet) return 'legacy';
  return 'unknown';
}

module.exports = {
  scanTopology,
  buildTopologyGraph
};
