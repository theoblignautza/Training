const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { backupDeviceConfig, restoreDeviceConfig } = require('../utils/device-manager');

// Backups directory
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

/**
 * GET /api/v1/backups
 * List all backups
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Get all backups from database
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

/**
 * GET /api/v1/backups/files
 * List all backup files in the filesystem
 */
router.get('/files', async (req, res) => {
  try {
    // Ensure backups directory exists
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
    
    // Sort by creation date (newest first)
    backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ files: backupFiles });
  } catch (error) {
    console.error('Error listing backup files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/backups/:id
 * Get backup details
 */
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
    
    // Read configuration file if it exists
    if (backup.filename) {
      const filepath = path.join(BACKUPS_DIR, backup.filename);
      try {
        const config = await fs.readFile(filepath, 'utf8');
        backup.config = config;
      } catch (readError) {
        console.error('Error reading backup file:', readError);
        backup.config = null;
      }
    }
    
    res.json({ backup });
  } catch (error) {
    console.error('Error getting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/backups/view/:filename
 * View backup file contents
 */
router.get('/view/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const config = await fs.readFile(filepath, 'utf8');
    
    res.json({ 
      filename,
      config,
      size: config.length
    });
  } catch (error) {
    console.error('Error viewing backup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/backups/download/:filename
 * Download backup file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Check if file exists
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

/**
 * POST /api/v1/backups
 * Create new backup for a device
 */
router.post('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { device_id } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }
    
    // Get device details
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    io.emit('log', {
      type: 'info',
      message: `Starting backup for ${device.hostname || device.ip_address}...`,
      timestamp: new Date().toISOString()
    });
    
    // Perform backup
    const result = await backupDeviceConfig(device, io);
    
    // Save backup record to database
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
    
    // Emit backup notification
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
    
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

/**
 * POST /api/v1/backups/restore
 * Restore configuration to a device
 */
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
    
    // Get device details
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get configuration
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
    
    // Security check
    if (backupFilename.includes('..') || backupFilename.includes('/') || backupFilename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Read configuration file
    const filepath = path.join(BACKUPS_DIR, backupFilename);
    config = await fs.readFile(filepath, 'utf8');
    
    io.emit('log', {
      type: 'info',
      message: `Starting restore for ${device.hostname || device.ip_address} using ${backupFilename}...`,
      timestamp: new Date().toISOString()
    });
    
    // Perform restore
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
    
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

/**
 * DELETE /api/v1/backups/:id
 * Delete a backup
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    // Get backup details
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // Delete file if it exists
    if (backup.filename) {
      const filepath = path.join(BACKUPS_DIR, backup.filename);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.warn('Failed to delete backup file:', error.message);
      }
    }
    
    // Delete from database
    db.prepare('DELETE FROM backups WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
