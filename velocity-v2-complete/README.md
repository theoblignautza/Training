# Velocity Network Manager v2.0 - Complete Installation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [What's New](#whats-new)
3. [Quick Start](#quick-start)
4. [Detailed Installation](#detailed-installation)
5. [Configuration](#configuration)
6. [Features Guide](#features-guide)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)
9. [Testing](#testing)

---

## 🎯 Overview

Velocity Network Manager is a comprehensive network device automation tool with:
- **Automatic network discovery** (SSH/Telnet port scanning)
- **Real-time logging** via WebSocket
- **Configuration backup and restore** for Cisco devices
- **SSH and Telnet support** (removed device type)
- **Live UI updates** with terminal-like output
- **Secure file viewing** and management
- **LAN accessibility** (backend accessible from any device on network)

---

## ✨ What's New

### Fixed Issues
✅ **JSON Parsing Error** - Backend now properly serves JSON instead of HTML  
✅ **npm Installation** - Both frontend and backend npm dependencies now install correctly  
✅ **Port Management** - Automatic port conflict detection and resolution  
✅ **LAN Access** - Backend listens on 0.0.0.0 for network-wide access

### New Features
🎯 **Device Discovery** - Scan subnets for devices with open SSH/Telnet ports  
📊 **Live Logs** - Real-time WebSocket streaming of system operations  
💾 **Backup Viewer** - Browse and view backup files in dashboard  
🔄 **Restore Function** - Push configurations back to devices  
🔧 **Protocol Selection** - Choose between SSH (port 22) and Telnet (port 23)  
🌐 **LAN Accessibility** - Access from any device on your network

### Removed/Changed
❌ **Device Type field removed** - Replaced with Protocol (ssh/telnet) and Port  
✅ **Default ports** - SSH: 22, Telnet: 23 (auto-selected based on protocol)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- SQLite3 (for database)
- Network access to target devices

### Installation (5 minutes)

```bash
# 1. Install Backend
cd backend
npm install

# 2. Install Frontend  
cd ../frontend
npm install

# 3. Start Backend (in one terminal)
cd backend
npm start
# Backend will run on http://0.0.0.0:8080

# 4. Start Frontend (in another terminal)
cd frontend
npm run dev
# Frontend will run on http://localhost:3000

# 5. Access Application
# Open browser to http://localhost:3000
```

---

## 📦 Detailed Installation

### Step 1: Backend Setup

```bash
cd backend
npm install
```

**Dependencies installed:**
- `express` - Web server
- `cors` - Cross-origin resource sharing
- `socket.io` - WebSocket for real-time logs
- `better-sqlite3` - Database
- `node-ssh` - SSH connections
- `telnet-client` - Telnet connections

**File structure:**
```
backend/
├── server.js              # Main server
├── package.json
├── database/
│   └── init.js            # Database initialization
├── routes/
│   ├── devices.js         # Device CRUD
│   ├── templates.js       # Template CRUD
│   ├── compliance.js      # Compliance checking
│   ├── config.js          # Backup/Restore
│   ├── discovery.js       # Network scanning
│   └── backups.js         # Backup management
└── utils/
    ├── device-manager.js  # SSH/Telnet handling
    └── network-scanner.js # Network discovery
```

### Step 2: Frontend Setup

```bash
cd frontend
npm install
```

**Dependencies installed:**
- `react` - UI framework
- `react-router-dom` - Routing
- `socket.io-client` - WebSocket client
- `vite` - Build tool
- `typescript` - Type safety

**Updated components:**
- `Dashboard.tsx` - Enhanced with discovery, logs, backups
- `DeviceForm.tsx` - Protocol/Port instead of DeviceType
- `LogViewer.tsx` - Real-time log display
- `DiscoveryPanel.tsx` - Network scanning UI
- `BackupViewer.tsx` - Backup viewing and restore

### Step 3: Database Initialization

The database automatically initializes on first run:

```sql
-- Devices table (updated schema)
CREATE TABLE devices (
  id INTEGER PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_address TEXT NOT NULL UNIQUE,
  protocol TEXT NOT NULL CHECK(protocol IN ('ssh', 'telnet')),
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

-- Backups table (new)
CREATE TABLE backups (
  id INTEGER PRIMARY KEY,
  device_id INTEGER,
  filename TEXT,
  filepath TEXT,
  size INTEGER,
  created_at TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- Discovery sessions table (new)
CREATE TABLE discovery_sessions (
  id INTEGER PRIMARY KEY,
  subnet TEXT,
  devices_found INTEGER,
  status TEXT,
  started_at TEXT,
  completed_at TEXT
);
```

---

## ⚙️ Configuration

### Backend Configuration

Edit `backend/server.js`:

```javascript
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0'; // For LAN access
```

### Frontend Configuration

Edit `frontend/services/api.ts`:

```typescript
// Change this to your backend server IP if accessing from another device
const API_BASE_URL = 'http://localhost:8080/api/v1';

// For LAN access from another device, use:
// const API_BASE_URL = 'http://192.168.1.100:8080/api/v1';
```

Edit `frontend/hooks/useWebSocket.tsx`:

```typescript
// Change this to match your backend
const SOCKET_URL = 'http://localhost:8080';

// For LAN access:
// const SOCKET_URL = 'http://192.168.1.100:8080';
```

### Environment Variables

Create `.env` file in backend:

```bash
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
```

---

## 🎮 Features Guide

### 1. Network Discovery

**Access:** Dashboard → "Discover Devices" button

**How it works:**
1. Enter subnet in CIDR notation (e.g., `192.168.1.0/24`)
2. Click "Start Scan"
3. System scans all IPs for open ports 22 (SSH) and 23 (Telnet)
4. Results show discovered devices with:
   - IP Address
   - Hostname (via reverse DNS)
   - Available protocols
   - Suggested protocol/port

**Add devices:**
1. Select discovered devices
2. Click "Add Selected Devices"
3. Devices added with default credentials (admin/admin)
4. **Important:** Update credentials after adding!

### 2. Live Logs

**Access:** Dashboard → "View Live Logs" button

**Features:**
- Real-time log streaming via WebSocket
- Color-coded by severity:
  - 🔵 Info (blue)
  - ✅ Success (green)
  - ⚠️ Warning (yellow)
  - ❌ Error (red)
- Auto-scrolls to latest
- Shows timestamps
- Keeps last 100 entries

**What's logged:**
- Device connections
- Backup operations
- Restore operations
- Discovery scans
- API requests
- Errors and warnings

### 3. Configuration Backup

**Access:** Devices page → Select device → "Backup" button

**Process:**
1. Connects to device via SSH or Telnet
2. Executes `show running-config`
3. Saves output to file
4. Records in database
5. Shows progress in live logs

**File naming:** `hostname_YYYY-MM-DDTHH-MM-SS.cfg`

### 4. Configuration Restore

**Access:** Dashboard → "View Backups" → Select backup → Select device → "Restore Config"

**Process:**
1. Connects to device
2. Enters configuration mode
3. Applies configuration line by line
4. Shows progress in real-time
5. Saves to device memory
6. Reports success/failure

**Safety features:**
- Requires confirmation
- Shows device hostname
- Progress tracking
- Error handling per line
- Automatic recovery

### 5. Backup Viewing

**Access:** Dashboard → "View Backups" button

**Features:**
- List all backups
- Group by device
- Sort by date
- View full configuration
- Download backup files
- Delete old backups

**Security:**
- Path validation (prevents directory traversal)
- Restricted to backups directory only
- Size limits enforced

### 6. Device Management

**Access:** Devices page

**New fields:**
- **Protocol:** SSH or Telnet (dropdown)
- **Port:** Automatically set based on protocol
  - SSH → 22
  - Telnet → 23
  - Custom ports supported

**Removed:**
- ❌ Device Type field

---

## 📡 API Documentation

### Base URL
```
http://localhost:8080/api/v1
```

### Endpoints

#### Health Check
```http
GET /health
Response: { "status": "ok", "timestamp": "...", "uptime": 123 }
```

#### Devices

```http
GET /devices
Response: Device[]

POST /devices
Body: { "Hostname": "...", "IPAddress": "...", "Protocol": "ssh", "Port": 22, "Username": "...", "Password": "..." }

PUT /devices/:id
Body: Partial<Device>

DELETE /devices/:id
```

#### Discovery

```http
POST /discovery/scan
Body: { "subnet": "192.168.1.0/24", "timeout": 5000 }
Response: { "sessionId": 1, "message": "..." }

GET /discovery/session/:id
Response: DiscoverySession
```

#### Backups

```http
GET /backups
Query: ?deviceId=1 (optional)
Response: Backup[]

GET /backups/:id/content
Response: { "filename": "...", "content": "..." }

GET /backups/:id/download
Response: File download

DELETE /backups/:id
```

#### Config Operations

```http
POST /config/backup/:deviceId
Response: { "message": "...", "filename": "...", "size": 12345 }

POST /config/restore/:deviceId
Body: { "backupId": 1 } OR { "configContent": "..." }
Response: { "message": "...", "output": "..." }

POST /config/push/:deviceId
Body: { "templateId": 1 }
Response: { "message": "...", "output": "..." }
```

### WebSocket Events

**Server → Client:**
```javascript
socket.on('log', (data: {
  type: 'info' | 'success' | 'warning' | 'error',
  message: string,
  timestamp: string
}));

socket.on('discovery-complete', (data: {
  sessionId: number,
  devices: DiscoveredDevice[]
}));
```

**Client → Server:**
```javascript
socket.emit('subscribe', 'room-name');
socket.emit('unsubscribe', 'room-name');
```

---

## 🔧 Troubleshooting

### "Backend Offline" Error

**Symptoms:**
- Dashboard shows "Backend: Offline"
- Red dot indicator
- "Unexpected token '<', "<!DOCTYPE" error

**Solutions:**

1. **Check backend is running:**
```bash
cd backend
npm start
```

2. **Check correct port:**
```bash
# Backend should show:
Server running on: http://0.0.0.0:8080
```

3. **Check API URL in frontend:**
```typescript
// frontend/services/api.ts
const API_BASE_URL = 'http://localhost:8080/api/v1';
```

4. **Check firewall:**
```bash
# Allow port 8080
sudo ufw allow 8080
```

### WebSocket Not Connecting

**Symptoms:**
- "WebSocket: Disconnected" in dashboard
- No live logs appearing

**Solutions:**

1. **Check backend WebSocket:**
```bash
# Backend logs should show:
WebSocket: ws://0.0.0.0:8080
```

2. **Check frontend WebSocket URL:**
```typescript
// frontend/hooks/useWebSocket.tsx
const SOCKET_URL = 'http://localhost:8080';
```

3. **Check CORS:**
```javascript
// backend/server.js
io = new Server(httpServer, {
  cors: {
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
```

### LAN Access Not Working

**Symptoms:**
- Can't access from other devices on network
- Connection refused from IP address

**Solutions:**

1. **Backend must listen on 0.0.0.0:**
```javascript
// backend/server.js
const HOST = '0.0.0.0'; // NOT 'localhost'
```

2. **Find server IP:**
```bash
# Linux/Mac
ip addr show | grep inet

# Windows
ipconfig
```

3. **Update frontend for LAN access:**
```typescript
// Replace localhost with server IP
const API_BASE_URL = 'http://192.168.1.100:8080/api/v1';
const SOCKET_URL = 'http://192.168.1.100:8080';
```

4. **Check firewall on server:**
```bash
sudo ufw allow from 192.168.1.0/24 to any port 8080
```

### Discovery Not Finding Devices

**Symptoms:**
- Scan completes but finds 0 devices
- Devices exist but not discovered

**Solutions:**

1. **Check subnet notation:**
```
Correct: 192.168.1.0/24
Wrong: 192.168.1.1/24
```

2. **Check device ports:**
```bash
# Test SSH
telnet 192.168.1.100 22

# Test Telnet
telnet 192.168.1.100 23
```

3. **Check network connectivity:**
```bash
ping 192.168.1.100
```

4. **Check firewall on devices:**
- Devices must allow incoming SSH/Telnet

### Backup/Restore Failing

**Symptoms:**
- Timeout errors
- Authentication failures
- Permission denied

**Solutions:**

1. **Check credentials:**
- Verify username/password
- Check enable password if required

2. **Check protocol/port:**
- Ensure correct protocol selected
- Verify port number

3. **Test connection manually:**
```bash
# SSH
ssh admin@192.168.1.100

# Telnet
telnet 192.168.1.100
```

4. **Check device permissions:**
- User must have privilege 15
- Or enable password must be set

---

## 🧪 Testing

### Manual Testing Checklist

#### Backend Health
- [ ] Backend starts without errors
- [ ] Database file created
- [ ] All routes respond
- [ ] WebSocket accepts connections

#### Device Management
- [ ] Add device with SSH
- [ ] Add device with Telnet
- [ ] Update device
- [ ] Delete device
- [ ] List devices

#### Discovery
- [ ] Scan subnet
- [ ] Find devices
- [ ] Show available protocols
- [ ] Add discovered devices

#### Backup/Restore
- [ ] Backup device via SSH
- [ ] Backup device via Telnet
- [ ] View backup content
- [ ] Restore configuration
- [ ] Delete backup

#### Live Logs
- [ ] WebSocket connects
- [ ] Logs appear in real-time
- [ ] Different log types show correctly
- [ ] Auto-scroll works

#### LAN Access
- [ ] Access from another device
- [ ] All features work remotely
- [ ] WebSocket works remotely

### Automated Tests

Create `backend/tests/api.test.js`:

```javascript
const request = require('supertest');
const { app } = require('../server');

describe('API Endpoints', () => {
  test('GET /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/v1/devices', async () => {
    const res = await request(app).get('/api/v1/devices');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

Run tests:
```bash
cd backend
npm test
```

---

## 📊 Architecture

### Technology Stack

**Backend:**
- Node.js + Express (REST API)
- Socket.IO (WebSocket)
- better-sqlite3 (Database)
- node-ssh (SSH connections)
- telnet-client (Telnet connections)

**Frontend:**
- React + TypeScript
- Vite (Build tool)
- Socket.IO Client (WebSocket)
- Tailwind CSS (Styling)

**Network:**
- Net module (Port scanning)
- DNS (Hostname resolution)

### Data Flow

```
User Action → Frontend → API Request → Backend → Device Operation
                    ↓                      ↓
              WebSocket ←─────────────── Real-time Logs
                    ↓
            Live UI Update
```

### Security Measures

1. **Input Validation**
   - IP address format checking
   - Subnet validation
   - Path traversal prevention

2. **File Access**
   - Restricted to backups directory
   - Path normalization
   - Access control

3. **Database**
   - SQL injection prevention (prepared statements)
   - Foreign key constraints
   - Data integrity checks

4. **Network**
   - Timeout on connections
   - Error handling
   - Credential encryption (in transit)

---

## 🚀 Production Deployment

### Recommended Setup

1. **Use Process Manager:**
```bash
npm install -g pm2

# Start backend
pm2 start backend/server.js --name velocity-backend

# Start frontend (build first)
cd frontend
npm run build
pm2 serve dist 3000 --name velocity-frontend
```

2. **Use Nginx Reverse Proxy:**
```nginx
server {
  listen 80;
  server_name velocity.local;

  location / {
    proxy_pass http://localhost:3000;
  }

  location /api {
    proxy_pass http://localhost:8080;
  }

  location /socket.io {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

3. **Environment Variables:**
```bash
# .env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DB_PATH=./data/velocity.db
BACKUP_DIR=./backups
```

4. **Systemd Service:**
```ini
[Unit]
Description=Velocity Backend
After=network.target

[Service]
Type=simple
User=velocity
WorkingDirectory=/opt/velocity/backend
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🆘 Support

For issues, questions, or contributions:
1. Check this README
2. Review troubleshooting section
3. Check logs: `cat backend/logs/*.log`
4. Create GitHub issue with logs and error details

---

## 🎉 Success Checklist

After installation, you should be able to:

- ✅ Access dashboard at `http://localhost:3000`
- ✅ See "Backend: Online" and "WebSocket: Connected"
- ✅ Add devices with SSH or Telnet
- ✅ Scan network for devices
- ✅ View live logs in real-time
- ✅ Backup device configurations
- ✅ View and restore backups
- ✅ Access from other devices on LAN

**You're ready to manage your network! 🚀**
