const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');

// Import route modules
const deviceRoutes = require('./routes/devices');
const templateRoutes = require('./routes/templates');
const complianceRoutes = require('./routes/compliance');
const configRoutes = require('./routes/config');
const discoveryRoutes = require('./routes/discovery');
const backupRoutes = require('./routes/backups');
const schedulerRoutes = require('./routes/scheduler');
const topologyRoutes = require('./routes/topology');

// Import database initialization
const { initializeDatabase } = require('./database/init');

// Import backup scheduler
const { initializeBackupScheduler } = require('./utils/backup-scheduler');

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database
const dbPath = path.join(__dirname, 'data', 'velocity.db');
const db = initializeDatabase(dbPath);
app.set('db', db);

// API Routes
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/backups', backupRoutes);
app.use('/api/v1/scheduler', schedulerRoutes);
app.use('/api/v1/topology', topologyRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0'
  });
});

// Root endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Velocity Network Manager API',
    version: '2.0.0',
    features: [
      'Multi-vendor Backup (Cisco, Ubiquiti, Aruba)',
      'Automated Scheduling',
      'Topology Visualization',
      'Real-time Updates'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  io.emit('log', {
    type: 'error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error'
  });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('log', {
    type: 'info',
    message: 'Connected to Velocity v2.0',
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize scheduler
initializeBackupScheduler(db, io);

// Graceful shutdown
process.on('SIGTERM', () => {
  httpServer.close(() => {
    db.close();
    process.exit(0);
  });
});

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Velocity Network Manager v2.0');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Server: http://${HOST}:${PORT}`);
  console.log('Features: Multi-vendor backup, Scheduling, Topology');
  console.log('═══════════════════════════════════════════════════════\n');
});

module.exports = { app, io, db };
