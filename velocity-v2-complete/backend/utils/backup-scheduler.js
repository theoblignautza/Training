const cron = require('node-cron');
const { backupDeviceConfig } = require('./device-manager');

let scheduledJobs = {};

function initializeBackupScheduler(db, io) {
  console.log('Initializing backup scheduler...');
  
  // Load all enabled schedules
  const schedules = db.prepare(`
    SELECT * FROM backup_schedules WHERE enabled = 1
  `).all();
  
  schedules.forEach(schedule => {
    startSchedule(schedule, db, io);
  });
  
  console.log(`Loaded ${schedules.length} backup schedules`);
}

function startSchedule(schedule, db, io) {
  if (scheduledJobs[schedule.id]) {
    scheduledJobs[schedule.id].stop();
  }
  
  const job = cron.schedule(schedule.cron_expression, async () => {
    console.log(`Running scheduled backup: ${schedule.name}`);
    
    io.emit('log', {
      type: 'info',
      message: `Starting scheduled backup: ${schedule.name}`,
      timestamp: new Date().toISOString()
    });
    
    // Update last run
    db.prepare(`
      UPDATE backup_schedules
      SET last_run = datetime('now')
      WHERE id = ?
    `).run(schedule.id);
    
    // Get devices to backup
    let deviceIds = [];
    if (schedule.device_ids) {
      deviceIds = JSON.parse(schedule.device_ids);
    } else {
      // Backup all devices
      const devices = db.prepare('SELECT id FROM devices WHERE enabled = 1').all();
      deviceIds = devices.map(d => d.id);
    }
    
    // Queue backups
    for (const deviceId of deviceIds) {
      queueBackup(deviceId, db, io);
    }
  });
  
  scheduledJobs[schedule.id] = job;
  console.log(`Started schedule: ${schedule.name} (${schedule.cron_expression})`);
}

function queueBackup(deviceId, db, io) {
  // Add to queue
  const result = db.prepare(`
    INSERT INTO backup_queue (device_id, status)
    VALUES (?, 'pending')
  `).run(deviceId);
  
  const queueId = result.lastInsertRowid;
  
  // Process immediately
  processBackupQueue(queueId, db, io);
}

async function processBackupQueue(queueId, db, io) {
  // Update status
  db.prepare(`
    UPDATE backup_queue
    SET status = 'running', started_at = datetime('now'), progress = 10
    WHERE id = ?
  `).run(queueId);
  
  // Get queue item and device
  const queueItem = db.prepare('SELECT * FROM backup_queue WHERE id = ?').get(queueId);
  const device = db.prepare(`
    SELECT id, hostname, ip_address, protocol, port, username, password, vendor
    FROM devices WHERE id = ?
  `).get(queueItem.device_id);
  
  if (!device) {
    db.prepare(`
      UPDATE backup_queue
      SET status = 'failed', error_message = 'Device not found', completed_at = datetime('now')
      WHERE id = ?
    `).run(queueId);
    return;
  }
  
  // Emit backup started
  io.emit('backup-started', {
    queueId,
    deviceId: device.id,
    hostname: device.hostname,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Update progress
    db.prepare('UPDATE backup_queue SET progress = 30 WHERE id = ?').run(queueId);
    
    io.emit('backup-progress', {
      queueId,
      progress: 30,
      message: 'Connecting to device...'
    });
    
    // Perform backup
    const result = await backupDeviceConfig(device, io);
    
    // Update progress
    db.prepare('UPDATE backup_queue SET progress = 80 WHERE id = ?').run(queueId);
    
    io.emit('backup-progress', {
      queueId,
      progress: 80,
      message: 'Saving configuration...'
    });
    
    // Save backup record
    const fs = require('fs').promises;
    const fileStats = await fs.stat(result.filepath);
    
    db.prepare(`
      INSERT INTO backups (device_id, filename, filepath, size)
      VALUES (?, ?, ?, ?)
    `).run(device.id, result.filename, result.filepath, fileStats.size);
    
    // Update queue as completed
    db.prepare(`
      UPDATE backup_queue
      SET status = 'completed', progress = 100, completed_at = datetime('now')
      WHERE id = ?
    `).run(queueId);
    
    io.emit('backup-completed', {
      queueId,
      deviceId: device.id,
      hostname: device.hostname,
      filename: result.filename,
      size: fileStats.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Backup failed:', error);
    
    db.prepare(`
      UPDATE backup_queue
      SET status = 'failed', error_message = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(error.message, queueId);
    
    io.emit('backup-failed', {
      queueId,
      deviceId: device.id,
      hostname: device.hostname,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  initializeBackupScheduler,
  startSchedule,
  queueBackup,
  processBackupQueue
};
