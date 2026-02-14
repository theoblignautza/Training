const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initializeDatabase(dbPath) {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  // Create tables
  db.exec(`
    -- Devices table
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostname TEXT NOT NULL,
      ip_address TEXT NOT NULL UNIQUE,
      protocol TEXT NOT NULL DEFAULT 'ssh' CHECK(protocol IN ('ssh', 'telnet')),
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      vendor TEXT DEFAULT 'cisco' CHECK(vendor IN ('cisco', 'ubiquiti', 'aruba', 'other')),
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Templates table
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Compliance reports table
    CREATE TABLE IF NOT EXISTS compliance_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      compliant INTEGER NOT NULL,
      report TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );
    
    -- Backups table
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      size INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );
    
    -- Backup queue for progress tracking
    CREATE TABLE IF NOT EXISTS backup_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
      progress INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );
    
    -- Backup schedules
    CREATE TABLE IF NOT EXISTS backup_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      device_ids TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Discovery sessions table
    CREATE TABLE IF NOT EXISTS discovery_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subnet TEXT NOT NULL,
      devices_found INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    
    -- Topology sessions
    CREATE TABLE IF NOT EXISTS topology_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subnet TEXT NOT NULL,
      devices_found INTEGER NOT NULL DEFAULT 0,
      topology_data TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    

    -- Persisted topology maps
    CREATE TABLE IF NOT EXISTS topology_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subnet TEXT,
      topology_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address);
    CREATE INDEX IF NOT EXISTS idx_devices_vendor ON devices(vendor);
    CREATE INDEX IF NOT EXISTS idx_backups_device ON backups(device_id);
    CREATE INDEX IF NOT EXISTS idx_backup_queue_status ON backup_queue(status);
    CREATE INDEX IF NOT EXISTS idx_backup_schedules_enabled ON backup_schedules(enabled);
    CREATE INDEX IF NOT EXISTS idx_topology_maps_created ON topology_maps(created_at);
  `);
  
  console.log('Database initialized successfully');
  return db;
}

module.exports = { initializeDatabase };
