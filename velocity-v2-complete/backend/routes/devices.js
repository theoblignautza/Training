const express = require('express');
const router = express.Router();

// Get all devices
router.get('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    
    const devices = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, enabled, created_at, updated_at
      FROM devices
      ORDER BY hostname
    `).all();
    
    // Transform to match frontend expectations
    const transformedDevices = devices.map(d => ({
      ID: d.id,
      Hostname: d.hostname,
      IPAddress: d.ip_address,
      Protocol: d.protocol,
      Port: d.port,
      Username: d.username,
      Enabled: Boolean(d.enabled),
      CreatedAt: d.created_at,
      UpdatedAt: d.updated_at
    }));
    
    io.emit('log', {
      type: 'info',
      message: `Retrieved ${devices.length} devices`,
      timestamp: new Date().toISOString()
    });
    
    res.json(transformedDevices);
  } catch (error) {
    next(error);
  }
});

// Get single device
router.get('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const device = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, enabled, created_at, updated_at
      FROM devices
      WHERE id = ?
    `).get(id);
    
    if (!device) {
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    res.json({
      ID: device.id,
      Hostname: device.hostname,
      IPAddress: device.ip_address,
      Protocol: device.protocol,
      Port: device.port,
      Username: device.username,
      Enabled: Boolean(device.enabled),
      CreatedAt: device.created_at,
      UpdatedAt: device.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// Add new device
router.post('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { Hostname, IPAddress, Protocol, Port, Username, Password } = req.body;
    
    // Validation
    if (!Hostname || !IPAddress || !Username || !Password) {
      return res.status(400).json({ 
        error: true, 
        message: 'Missing required fields: Hostname, IPAddress, Username, Password' 
      });
    }
    
    // Validate protocol
    const protocol = (Protocol || 'ssh').toLowerCase();
    if (!['ssh', 'telnet'].includes(protocol)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Protocol must be either "ssh" or "telnet"' 
      });
    }
    
    // Set default port based on protocol
    const port = Port || (protocol === 'ssh' ? 22 : 23);
    
    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(IPAddress)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Invalid IP address format' 
      });
    }
    
    const stmt = db.prepare(`
      INSERT INTO devices (hostname, ip_address, protocol, port, username, password)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(Hostname, IPAddress, protocol, port, Username, Password);
    
    const newDevice = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, enabled, created_at, updated_at
      FROM devices
      WHERE id = ?
    `).get(result.lastInsertRowid);
    
    io.emit('log', {
      type: 'success',
      message: `Device added: ${Hostname} (${IPAddress})`,
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({
      ID: newDevice.id,
      Hostname: newDevice.hostname,
      IPAddress: newDevice.ip_address,
      Protocol: newDevice.protocol,
      Port: newDevice.port,
      Username: newDevice.username,
      Enabled: Boolean(newDevice.enabled),
      CreatedAt: newDevice.created_at,
      UpdatedAt: newDevice.updated_at
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ 
        error: true, 
        message: 'A device with this IP address already exists' 
      });
    }
    next(error);
  }
});

// Update device
router.put('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { id } = req.params;
    const updates = req.body;
    
    // Check if device exists
    const existing = db.prepare('SELECT id FROM devices WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    // Build dynamic update query
    const allowedFields = {
      'Hostname': 'hostname',
      'IPAddress': 'ip_address',
      'Protocol': 'protocol',
      'Port': 'port',
      'Username': 'username',
      'Password': 'password',
      'Enabled': 'enabled'
    };
    
    const updateFields = [];
    const values = [];
    
    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        if (key === 'Protocol') {
          const protocol = updates[key].toLowerCase();
          if (!['ssh', 'telnet'].includes(protocol)) {
            return res.status(400).json({ 
              error: true, 
              message: 'Protocol must be either "ssh" or "telnet"' 
            });
          }
          updateFields.push(`${dbField} = ?`);
          values.push(protocol);
        } else if (key === 'Enabled') {
          updateFields.push(`${dbField} = ?`);
          values.push(updates[key] ? 1 : 0);
        } else {
          updateFields.push(`${dbField} = ?`);
          values.push(updates[key]);
        }
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'No valid fields to update' 
      });
    }
    
    updateFields.push('updated_at = datetime(\'now\')');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE devices
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    const updated = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, enabled, created_at, updated_at
      FROM devices
      WHERE id = ?
    `).get(id);
    
    io.emit('log', {
      type: 'info',
      message: `Device updated: ${updated.hostname}`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      ID: updated.id,
      Hostname: updated.hostname,
      IPAddress: updated.ip_address,
      Protocol: updated.protocol,
      Port: updated.port,
      Username: updated.username,
      Enabled: Boolean(updated.enabled),
      CreatedAt: updated.created_at,
      UpdatedAt: updated.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// Delete device
router.delete('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { id } = req.params;
    
    const device = db.prepare('SELECT hostname FROM devices WHERE id = ?').get(id);
    if (!device) {
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    const stmt = db.prepare('DELETE FROM devices WHERE id = ?');
    stmt.run(id);
    
    io.emit('log', {
      type: 'warning',
      message: `Device deleted: ${device.hostname}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
