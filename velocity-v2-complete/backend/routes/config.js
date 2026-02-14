const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { backupDeviceConfig, restoreDeviceConfig } = require('../utils/device-manager');

// Backup device configuration
router.post('/backup/:deviceId', async (req, res, next) => {
  const io = req.app.get('io');
  const db = req.app.get('db');
  const { deviceId } = req.params;
  
  try {
    io.emit('log', {
      type: 'info',
      message: `Starting backup for device ID: ${deviceId}`,
      timestamp: new Date().toISOString()
    });
    
    // Get device info
    const device = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, password
      FROM devices
      WHERE id = ?
    `).get(deviceId);
    
    if (!device) {
      io.emit('log', {
        type: 'error',
        message: `Device not found: ID ${deviceId}`,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    io.emit('log', {
      type: 'info',
      message: `Connecting to ${device.hostname} (${device.ip_address}) via ${device.protocol.toUpperCase()}`,
      timestamp: new Date().toISOString()
    });
    
    // Perform backup
    const result = await backupDeviceConfig(device, io);
    
    // Save backup record to database
    const stmt = db.prepare(`
      INSERT INTO backups (device_id, filename, filepath, size)
      VALUES (?, ?, ?, ?)
    `);
    
    const fileStats = await fs.stat(result.filepath);
    stmt.run(deviceId, result.filename, result.filepath, fileStats.size);
    
    io.emit('log', {
      type: 'success',
      message: `Backup completed: ${result.filename} (${fileStats.size} bytes)`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Backup completed successfully',
      filename: result.filename,
      size: fileStats.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `Backup failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

// Restore device configuration
router.post('/restore/:deviceId', async (req, res, next) => {
  const io = req.app.get('io');
  const db = req.app.get('db');
  const { deviceId } = req.params;
  const { backupId, configContent } = req.body;
  
  try {
    io.emit('log', {
      type: 'info',
      message: `Starting restore for device ID: ${deviceId}`,
      timestamp: new Date().toISOString()
    });
    
    // Get device info
    const device = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, password
      FROM devices
      WHERE id = ?
    `).get(deviceId);
    
    if (!device) {
      io.emit('log', {
        type: 'error',
        message: `Device not found: ID ${deviceId}`,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    let config;
    
    // Get config content from backup file or request body
    if (backupId) {
      const backup = db.prepare('SELECT filepath FROM backups WHERE id = ?').get(backupId);
      if (!backup) {
        return res.status(404).json({ error: true, message: 'Backup not found' });
      }
      config = await fs.readFile(backup.filepath, 'utf8');
      io.emit('log', {
        type: 'info',
        message: `Using backup file: ${path.basename(backup.filepath)}`,
        timestamp: new Date().toISOString()
      });
    } else if (configContent) {
      config = configContent;
      io.emit('log', {
        type: 'info',
        message: 'Using provided configuration content',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({ 
        error: true, 
        message: 'Either backupId or configContent must be provided' 
      });
    }
    
    io.emit('log', {
      type: 'info',
      message: `Connecting to ${device.hostname} (${device.ip_address}) via ${device.protocol.toUpperCase()}`,
      timestamp: new Date().toISOString()
    });
    
    // Perform restore
    const result = await restoreDeviceConfig(device, config, io);
    
    io.emit('log', {
      type: 'success',
      message: `Restore completed successfully`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Restore completed successfully',
      output: result.output,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `Restore failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

// Push template configuration to device
router.post('/push/:deviceId', async (req, res, next) => {
  const io = req.app.get('io');
  const db = req.app.get('db');
  const { deviceId } = req.params;
  const { templateId } = req.body;
  
  try {
    if (!templateId) {
      return res.status(400).json({ 
        error: true, 
        message: 'templateId is required' 
      });
    }
    
    io.emit('log', {
      type: 'info',
      message: `Pushing template to device ID: ${deviceId}`,
      timestamp: new Date().toISOString()
    });
    
    // Get device and template
    const device = db.prepare(`
      SELECT id, hostname, ip_address, protocol, port, username, password
      FROM devices
      WHERE id = ?
    `).get(deviceId);
    
    const template = db.prepare('SELECT content FROM templates WHERE id = ?').get(templateId);
    
    if (!device) {
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    if (!template) {
      return res.status(404).json({ error: true, message: 'Template not found' });
    }
    
    // Use restore function to push template
    const result = await restoreDeviceConfig(device, template.content, io);
    
    io.emit('log', {
      type: 'success',
      message: `Template pushed successfully`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Template pushed successfully',
      output: result.output,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `Push failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

module.exports = router;
