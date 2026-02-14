const express = require('express');
const router = express.Router();
const { NodeSSH } = require('node-ssh');
const { scanTopology } = require('../utils/topology-scanner');

function normalizeTopologyPayload(topology, subnet) {
  return {
    nodes: Array.isArray(topology?.nodes) ? topology.nodes : [],
    edges: Array.isArray(topology?.edges) ? topology.edges : [],
    subnet: topology?.subnet || subnet,
    scannedAt: topology?.scannedAt || new Date().toISOString()
  };
}

router.post('/scan', async (req, res, next) => {
  const io = req.app.get('io');
  const db = req.app.get('db');
  const { subnet } = req.body;

  try {
    const targetSubnet = subnet || '192.168.1.0/24';
    const session = db.prepare(`INSERT INTO topology_sessions (subnet, status) VALUES (?, 'running')`).run(targetSubnet);
    const sessionId = session.lastInsertRowid;

    io.emit('log', {
      type: 'info',
      message: `Starting topology scan: ${targetSubnet}`,
      timestamp: new Date().toISOString()
    });

    scanTopology(targetSubnet, db, io, sessionId)
      .then((topology) => {
        db.prepare(`
          UPDATE topology_sessions
          SET devices_found = ?, topology_data = ?, status = 'completed', completed_at = datetime('now')
          WHERE id = ?
        `).run(topology.nodes.length, JSON.stringify(topology), sessionId);

        io.emit('topology-complete', {
          sessionId,
          topology,
          subnet: targetSubnet,
          timestamp: new Date().toISOString()
        });
      })
      .catch((error) => {
        db.prepare(`UPDATE topology_sessions SET status = 'failed', completed_at = datetime('now') WHERE id = ?`).run(sessionId);
        io.emit('log', {
          type: 'error',
          message: `Topology scan failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      });

    res.json({ message: 'Topology scan started', sessionId, subnet: targetSubnet });
  } catch (error) {
    next(error);
  }
});

router.get('/session/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const session = db.prepare(`SELECT * FROM topology_sessions WHERE id = ?`).get(id);

    if (!session) {
      return res.status(404).json({ error: true, message: 'Session not found' });
    }

    res.json({
      ID: session.id,
      Subnet: session.subnet,
      DevicesFound: session.devices_found,
      Topology: session.topology_data ? JSON.parse(session.topology_data) : null,
      Status: session.status,
      StartedAt: session.started_at,
      CompletedAt: session.completed_at
    });
  } catch (error) {
    next(error);
  }
});

router.post('/maps', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { name, subnet, topology } = req.body;

    if (!name || !topology) {
      return res.status(400).json({ error: true, message: 'name and topology are required' });
    }

    const payload = normalizeTopologyPayload(topology, subnet);
    const result = db.prepare(`
      INSERT INTO topology_maps (name, subnet, topology_data)
      VALUES (?, ?, ?)
    `).run(name, subnet || payload.subnet || 'unknown', JSON.stringify(payload));

    res.status(201).json({
      ID: result.lastInsertRowid,
      Name: name,
      Subnet: subnet || payload.subnet || 'unknown',
      Topology: payload
    });
  } catch (error) {
    next(error);
  }
});

router.get('/maps', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const maps = db.prepare(`SELECT * FROM topology_maps ORDER BY created_at DESC`).all();
    res.json(maps.map((map) => ({
      ID: map.id,
      Name: map.name,
      Subnet: map.subnet,
      Topology: map.topology_data ? JSON.parse(map.topology_data) : null,
      CreatedAt: map.created_at,
      UpdatedAt: map.updated_at
    })));
  } catch (error) {
    next(error);
  }
});

router.post('/ssh-probe', async (req, res, next) => {
  const io = req.app.get('io');
  const { host, username, password, port } = req.body;

  if (!host || !username || !password) {
    return res.status(400).json({ error: true, message: 'host, username and password are required' });
  }

  const ssh = new NodeSSH();

  try {
    await ssh.connect({ host, username, password, port: Number(port) || 22, readyTimeout: 15000, tryKeyboard: true });

    const probeCommands = [
      'show version',
      'show inventory',
      'show system',
      'uname -a',
      'hostname'
    ];

    const outputs = [];
    for (const command of probeCommands) {
      const result = await ssh.execCommand(command);
      if (result.stdout) outputs.push(result.stdout);
    }

    const joinedOutput = outputs.join('\n');
    const metadata = {
      ip: host,
      hostname: extractValue(joinedOutput, [/hostname\s*[:=]\s*([^\n]+)/i, /^([^\s#>]+)[#>]/m]) || host,
      vendor: detectVendor(joinedOutput),
      model: extractValue(joinedOutput, [/model\s*(?:number)?\s*[:#]?\s*([^\n,]+)/i, /cisco\s+([A-Z0-9\-]+)/i]) || 'Unknown'
    };

    io.emit('log', {
      type: 'success',
      message: `SSH probe successful for ${host} (${metadata.vendor} ${metadata.model})`,
      timestamp: new Date().toISOString()
    });

    res.json(metadata);
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `SSH probe failed for ${host}: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    next(error);
  } finally {
    ssh.dispose();
  }
});

function detectVendor(output) {
  const lower = output.toLowerCase();
  if (lower.includes('cisco')) return 'Cisco';
  if (lower.includes('ubiquiti') || lower.includes('edgeos') || lower.includes('unifi')) return 'Ubiquiti';
  if (lower.includes('aruba') || lower.includes('procurve')) return 'Aruba';
  return 'Unknown';
}

function extractValue(content, patterns) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

module.exports = router;
