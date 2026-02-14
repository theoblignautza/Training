const express = require('express');
const router = express.Router();
const { discoverDevices } = require('../utils/network-scanner');

// Discover devices on network
router.post('/scan', async (req, res, next) => {
  const io = req.app.get('io');
  const db = req.app.get('db');
  const { subnet, timeout } = req.body;
  
  try {
    // Default to scanning local subnet if not specified
    const targetSubnet = subnet || '192.168.1.0/24';
    const scanTimeout = timeout || 5000;
    
    io.emit('log', {
      type: 'info',
      message: `Starting network scan on ${targetSubnet}`,
      timestamp: new Date().toISOString()
    });
    
    // Create discovery session
    const sessionStmt = db.prepare(`
      INSERT INTO discovery_sessions (subnet, status)
      VALUES (?, 'running')
    `);
    
    const session = sessionStmt.run(targetSubnet);
    const sessionId = session.lastInsertRowid;
    
    // Start discovery (async)
    discoverDevices(targetSubnet, scanTimeout, io)
      .then(devices => {
        // Update session
        db.prepare(`
          UPDATE discovery_sessions
          SET devices_found = ?, status = 'completed', completed_at = datetime('now')
          WHERE id = ?
        `).run(devices.length, sessionId);
        
        io.emit('log', {
          type: 'success',
          message: `Discovery completed: Found ${devices.length} devices`,
          timestamp: new Date().toISOString()
        });
        
        io.emit('discovery-complete', {
          sessionId,
          devices,
          timestamp: new Date().toISOString()
        });
      })
      .catch(error => {
        db.prepare(`
          UPDATE discovery_sessions
          SET status = 'failed', completed_at = datetime('now')
          WHERE id = ?
        `).run(sessionId);
        
        io.emit('log', {
          type: 'error',
          message: `Discovery failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      });
    
    res.json({
      message: 'Discovery started',
      sessionId,
      subnet: targetSubnet,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get discovery session status
router.get('/session/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const session = db.prepare(`
      SELECT id, subnet, devices_found, status, started_at, completed_at
      FROM discovery_sessions
      WHERE id = ?
    `).get(id);
    
    if (!session) {
      return res.status(404).json({ error: true, message: 'Session not found' });
    }
    
    res.json({
      ID: session.id,
      Subnet: session.subnet,
      DevicesFound: session.devices_found,
      Status: session.status,
      StartedAt: session.started_at,
      CompletedAt: session.completed_at
    });
  } catch (error) {
    next(error);
  }
});

// Get all discovery sessions
router.get('/sessions', (req, res, next) => {
  try {
    const db = req.app.get('db');
    
    const sessions = db.prepare(`
      SELECT id, subnet, devices_found, status, started_at, completed_at
      FROM discovery_sessions
      ORDER BY started_at DESC
      LIMIT 50
    `).all();
    
    const transformedSessions = sessions.map(s => ({
      ID: s.id,
      Subnet: s.subnet,
      DevicesFound: s.devices_found,
      Status: s.status,
      StartedAt: s.started_at,
      CompletedAt: s.completed_at
    }));
    
    res.json(transformedSessions);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
