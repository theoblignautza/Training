# 🚀 Velocity Network Manager v2.0 - START HERE

## What's Included

This package contains the **complete, working source code** for Velocity Network Manager v2.0 with ALL requested features:

✅ **Live logs viewport** - Always visible on dashboard  
✅ **Backup buttons** - On every device in device list  
✅ **Multi-vendor support** - Cisco, Ubiquiti, Aruba, Juniper  
✅ **Backup notifications** - Real-time progress popups  
✅ **Config sidebar** - View, download, restore configs  
✅ **Enterprise scheduling** - Automated cron-based backups  
✅ **Top-Viewer** - Interactive network topology visualization  

## Quick Start (3 Steps)

### 1. Fix Node.js Version (If Needed)

If you're using Node.js 24, run this first:

```bash
./fix-node-version.sh
```

This will install Node.js 20 LTS which is required.

### 2. Start Everything

```bash
chmod +x start-all.sh
./start-all.sh
```

This will:
- Install all dependencies (automatically)
- Start backend on port 8080
- Start frontend on port 3000
- Display access URLs

### 3. Open Your Browser

Go to: **http://localhost:3000**

That's it! The application is now running with all v2.0 features.

## What You'll See

### Dashboard Features
- **Live Logs Viewport** - Bottom of dashboard, always visible
- **4 Action Buttons**: Discover Devices, View Configs, Top-Viewer, Manage Devices
- **Real-time Status** - Backend and WebSocket connection status
- **Stats Cards** - Devices, templates, backups count

### Device Management
1. Click "Manage Devices"
2. Each device has a **💾 Backup** button
3. Click backup to start configuration backup
4. Watch real-time progress notification appear

### Config Files Sidebar
1. Click "📁 View Configs" on dashboard
2. See list of all backups on left
3. Click a backup to view content
4. Download button available

### Top-Viewer (Topology)
1. Click "🗺️ Top-Viewer" on dashboard
2. Enter subnet (e.g., `192.168.1.0/24`)
3. Click "Scan Network"
4. Watch topology map build in real-time
5. Interactive graph with zoom/pan

### Discovery (Unchanged)
1. Click "🔍 Discover Devices"
2. Enter subnet
3. Select discovered devices
4. Add to device list

## File Structure

```
velocity-v2-complete/
├── backend/
│   ├── server.js               # Main server
│   ├── package.json
│   ├── database/
│   │   └── init.js             # Enhanced schema
│   ├── routes/
│   │   ├── devices.js
│   │   ├── backups.js
│   │   ├── config.js
│   │   ├── discovery.js
│   │   ├── templates.js
│   │   ├── compliance.js
│   │   ├── scheduler.js        ⭐ NEW
│   │   └── topology.js         ⭐ NEW
│   └── utils/
│       ├── device-manager.js   # Multi-vendor
│       ├── network-scanner.js
│       ├── backup-scheduler.js ⭐ NEW
│       └── topology-scanner.js ⭐ NEW
├── frontend/
│   ├── components/
│   │   ├── LiveLogsViewport.tsx      ⭐ NEW
│   │   ├── BackupButton.tsx          ⭐ NEW
│   │   ├── BackupNotification.tsx    ⭐ NEW
│   │   ├── ConfigSidebar.tsx         ⭐ NEW
│   │   ├── TopViewer.tsx             ⭐ NEW
│   │   ├── DeviceForm.tsx
│   │   ├── DiscoveryPanel.tsx
│   │   └── BackupViewer.tsx
│   └── pages/
│       ├── Dashboard.tsx             ⭐ UPDATED
│       └── Devices.tsx               ⭐ UPDATED
├── start-all.sh                      # One-command start
├── fix-node-version.sh              # Node.js fixer
└── README-START-HERE.md             # This file
```

## Testing Features

### Test 1: Backup Button
1. Go to Devices page
2. See 💾 Backup button next to each device
3. Click it
4. See notification in bottom-right corner
5. Progress bar updates in real-time

### Test 2: Live Logs
1. Go to Dashboard
2. Scroll down - logs viewport is always visible
3. Perform any action (backup, discovery)
4. See logs appear in real-time

### Test 3: Config Sidebar
1. Click "View Configs" button
2. Sidebar slides in from right
3. List of backups on left
4. Click one to view
5. Full config displayed
6. Download button works

### Test 4: Top-Viewer
1. Click "Top-Viewer" button
2. Full-screen topology opens
3. Enter your subnet
4. Click "Scan Network"
5. Progress bar shows scanning
6. Devices appear as nodes
7. Interactive graph (drag, zoom, pan)

### Test 5: Multi-Vendor
1. Add device with vendor: Cisco
2. Add device with vendor: Ubiquiti
3. Add device with vendor: Aruba
4. Backup each - different commands used

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or change port in backend/server.js
```

### better-sqlite3 Won't Compile

```bash
# Install Node.js 20 LTS
./fix-node-version.sh

# Or manually
nvm install 20
nvm use 20
```

### Frontend Won't Start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Not Connecting

1. Check backend is running: `curl http://localhost:8080/api/v1/health`
2. Check browser console for errors
3. Verify ports 8080 and 3000 are not blocked

## Next Steps

1. **Add Your Devices** - Go to Devices page and add your network equipment
2. **Test Backups** - Click backup button on a device
3. **Schedule Backups** - Set up automated backups (future feature UI coming)
4. **Explore Topology** - Scan your network and view the map

## Key Dependencies

**Backend:**
- better-sqlite3 (database)
- express (web server)
- socket.io (WebSocket)
- node-ssh & telnet-client (device connectivity)
- node-cron (scheduling)

**Frontend:**
- React 19
- ReactFlow (topology)
- Socket.IO client
- TypeScript

## Features Summary

| Feature | Status | Location |
|---------|--------|----------|
| Live Logs Viewport | ✅ Working | Dashboard (always visible) |
| Backup Buttons | ✅ Working | Devices page |
| Real-time Notifications | ✅ Working | Automatic popups |
| Config Sidebar | ✅ Working | Dashboard → "View Configs" |
| Top-Viewer | ✅ Working | Dashboard → "Top-Viewer" |
| Multi-vendor Support | ✅ Working | Backend device manager |
| Discovery | ✅ Working | Dashboard → "Discover" |
| Enterprise Scheduling | ✅ Working | Backend (UI coming) |

## Support

For detailed documentation, see:
- **README.md** - Full documentation
- **QUICKSTART.md** - Step-by-step guide
- **DEPLOYMENT-SUMMARY.md** - Deployment checklist

## Success Checklist

After running `./start-all.sh`, verify:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Dashboard loads at localhost:3000
- [ ] Live logs appear on dashboard
- [ ] Backup buttons visible on devices
- [ ] Config sidebar opens
- [ ] Top-Viewer opens
- [ ] Network discovery works

If all checked, you're good to go! 🎉

---

**Velocity Network Manager v2.0** - Enterprise network configuration management made simple.
