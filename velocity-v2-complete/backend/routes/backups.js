const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Get all backups
router.get('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { deviceId } = req.query;
    
    let query = `
      SELECT 
        b.id, b.device_id, b.filename, b.filepath, b.size, b.created_at,
        d.hostname, d.ip_address
      FROM backups b
      JOIN devices d ON b.device_id = d.id
    `;
    
    const params = [];
    
    if (deviceId) {
      query += ' WHERE b.device_id = ?';
      params.push(deviceId);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const stmt = db.prepare(query);
    const backups = stmt.all(...params);
    
    const transformedBackups = backups.map(b => ({
      ID: b.id,
      DeviceID: b.device_id,
      Filename: b.filename,
      Filepath: b.filepath,
      Size: b.size,
      CreatedAt: b.created_at,
      DeviceHostname: b.hostname,
      DeviceIP: b.ip_address
    }));
    
    res.json(transformedBackups);
  } catch (error) {
    next(error);
  }
});

// Get single backup details
router.get('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const backup = db.prepare(`
      SELECT 
        b.id, b.device_id, b.filename, b.filepath, b.size, b.created_at,
        d.hostname, d.ip_address
      FROM backups b
      JOIN devices d ON b.device_id = d.id
      WHERE b.id = ?
    `).get(id);
    
    if (!backup) {
      return res.status(404).json({ error: true, message: 'Backup not found' });
    }
    
    res.json({
      ID: backup.id,
      DeviceID: backup.device_id,
      Filename: backup.filename,
      Filepath: backup.filepath,
      Size: backup.size,
      CreatedAt: backup.created_at,
      DeviceHostname: backup.hostname,
      DeviceIP: backup.ip_address
    });
  } catch (error) {
    next(error);
  }
});

// Get backup file content
router.get('/:id/content', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const backup = db.prepare('SELECT filepath, filename FROM backups WHERE id = ?').get(id);
    
    if (!backup) {
      return res.status(404).json({ error: true, message: 'Backup not found' });
    }
    
    // Security: Validate filepath to prevent directory traversal
    const normalizedPath = path.normalize(backup.filepath);
    const backupsDir = path.join(__dirname, '..', 'backups');
    
    if (!normalizedPath.startsWith(backupsDir)) {
      return res.status(403).json({ 
        error: true, 
        message: 'Access denied: Invalid file path' 
      });
    }
    
    try {
      const content = await fs.readFile(backup.filepath, 'utf8');
      
      res.json({
        filename: backup.filename,
        content: content,
        size: content.length
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ 
          error: true, 
          message: 'Backup file not found on disk' 
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Download backup file
router.get('/:id/download', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const backup = db.prepare('SELECT filepath, filename FROM backups WHERE id = ?').get(id);
    
    if (!backup) {
      return res.status(404).json({ error: true, message: 'Backup not found' });
    }
    
    // Security: Validate filepath
    const normalizedPath = path.normalize(backup.filepath);
    const backupsDir = path.join(__dirname, '..', 'backups');
    
    if (!normalizedPath.startsWith(backupsDir)) {
      return res.status(403).json({ 
        error: true, 
        message: 'Access denied: Invalid file path' 
      });
    }
    
    try {
      await fs.access(backup.filepath);
      res.download(backup.filepath, backup.filename);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ 
          error: true, 
          message: 'Backup file not found on disk' 
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Delete backup
router.delete('/:id', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { id } = req.params;
    
    const backup = db.prepare('SELECT filepath, filename FROM backups WHERE id = ?').get(id);
    
    if (!backup) {
      return res.status(404).json({ error: true, message: 'Backup not found' });
    }
    
    // Delete file from disk
    try {
      await fs.unlink(backup.filepath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Delete record from database
    db.prepare('DELETE FROM backups WHERE id = ?').run(id);
    
    io.emit('log', {
      type: 'warning',
      message: `Backup deleted: ${backup.filename}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get backup statistics
router.get('/stats/summary', (req, res, next) => {
  try {
    const db = req.app.get('db');
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_backups,
        COUNT(DISTINCT device_id) as devices_with_backups,
        SUM(size) as total_size,
        MAX(created_at) as latest_backup
      FROM backups
    `).get();
    
    res.json({
      TotalBackups: stats.total_backups,
      DevicesWithBackups: stats.devices_with_backups,
      TotalSize: stats.total_size || 0,
      LatestBackup: stats.latest_backup
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
