# 🚀 Velocity Network Manager v2.0 - Installation Guide

## One-Command Installation

```bash
./start.sh
```

That's it! The enterprise installer handles everything automatically.

## What the Installer Does

### ✅ Automatic Checks
1. **Node.js Version** - Verifies v18+ (recommends v20 LTS)
2. **Port Availability** - Checks ports 8080 and 3000
3. **Process Cleanup** - Kills any conflicting services
4. **Dependencies** - Installs npm packages if needed

### ✅ Automatic Actions
- **Kills persistent processes** on backend/frontend ports
- **Installs dependencies** (first run only)
- **Starts backend** (port 8080)
- **Starts frontend** (port 3000)
- **Health checks** backend API
- **Monitors services** for crashes

### ✅ Graceful Shutdown
- Press `Ctrl+C` to stop all services
- Automatic cleanup on exit
- Or run: `./stop.sh`

## Installation Steps

### Step 1: Extract Package
```bash
tar -xzf velocity-v2-complete-FIXED.tar.gz
cd velocity-v2-complete
```

### Step 2: Make Executable
```bash
chmod +x start.sh stop.sh fix-node-version.sh
```

### Step 3: Start
```bash
./start.sh
```

The installer will:
- Check your system ✓
- Clear ports 8080 and 3000 ✓
- Install dependencies (if needed) ✓
- Start both services ✓
- Display access URLs ✓

## Access the Application

Once started, open your browser:

🌐 **Dashboard:** http://localhost:3000  
⚙️ **Backend API:** http://localhost:8080

## Common Issues

### Issue: Port Already in Use

**The installer handles this automatically!**

It will:
1. Detect processes on ports 8080 and 3000
2. Attempt graceful shutdown (SIGTERM)
3. Force kill if needed (SIGKILL)
4. Verify ports are free

### Issue: Node.js Version

If you see "Node.js version too old":

```bash
./fix-node-version.sh
```

This installs Node.js 20 LTS via NVM.

### Issue: Dependencies Won't Install

**Backend:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..
```

**Frontend:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
```

Then run `./start.sh` again.

### Issue: Services Crash

Check the logs:
```bash
# Backend logs
tail -f backend.log

# Frontend logs
tail -f frontend.log
```

## Managing Services

### Start Services
```bash
./start.sh
```

### Stop Services
```bash
./stop.sh
```
Or press `Ctrl+C` in the terminal running start.sh.

### Restart Services
```bash
./stop.sh
./start.sh
```

### Check If Running
```bash
# Check backend
curl http://localhost:8080/api/v1/health

# Check frontend
curl http://localhost:3000

# Check processes
ps aux | grep node
```

## What Gets Installed

### Backend Dependencies
- express (web framework)
- better-sqlite3 (database)
- socket.io (WebSocket)
- node-ssh (SSH connectivity)
- telnet-client (Telnet connectivity)
- node-cron (scheduling)
- archiver (backup compression)

### Frontend Dependencies
- react (UI framework)
- react-router-dom (routing)
- socket.io-client (WebSocket)
- reactflow (topology visualization)
- vite (build tool)

## File Structure After Installation

```
velocity-v2-complete/
├── start.sh              ← RUN THIS
├── stop.sh               ← Stop services
├── fix-node-version.sh   ← Fix Node.js version
├── backend/
│   ├── node_modules/     ← Auto-installed
│   ├── data/             ← Database files
│   ├── backups/          ← Config backups
│   └── ...
├── frontend/
│   ├── node_modules/     ← Auto-installed
│   └── ...
├── .pids/                ← Process IDs
├── backend.log           ← Backend logs
└── frontend.log          ← Frontend logs
```

## Logs

The installer creates log files:

**Backend Log:** `backend.log`
```bash
tail -f backend.log
```

**Frontend Log:** `frontend.log`
```bash
tail -f frontend.log
```

## Health Monitoring

The start.sh script monitors both services:
- Checks every 5 seconds
- Auto-exits if a service crashes
- Displays error and log location

## Production Deployment

For production use:

1. **Use PM2** instead of start.sh:
```bash
npm install -g pm2
pm2 start backend/server.js --name velocity-backend
pm2 start "npm run dev" --cwd frontend --name velocity-frontend
pm2 save
pm2 startup
```

2. **Use Nginx** as reverse proxy
3. **Enable HTTPS** with SSL certificates
4. **Set up firewall** rules
5. **Configure environment** variables

## Troubleshooting

### Problem: "Node.js not installed"
**Solution:** 
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use NVM
./fix-node-version.sh
```

### Problem: "npm not found"
**Solution:** npm comes with Node.js - reinstall Node.js

### Problem: "Port 8080 in use"
**Solution:** The installer kills it automatically. If it persists:
```bash
sudo lsof -ti :8080 | xargs kill -9
```

### Problem: "Permission denied"
**Solution:** 
```bash
chmod +x start.sh stop.sh
```

### Problem: Backend starts but health check fails
**Solution:** 
```bash
# Check logs
cat backend.log

# Common causes:
# - Database file locked
# - Port actually in use by another app
# - File permissions issue
```

## Security Notes

### Default Configuration
- Backend binds to `0.0.0.0:8080` (all interfaces)
- No authentication enabled by default
- Passwords stored in plaintext in database

### For Production
1. Enable authentication
2. Use HTTPS
3. Encrypt database
4. Set up firewall rules
5. Run behind reverse proxy
6. Use environment variables for secrets

## Next Steps After Installation

1. **Access Dashboard:** http://localhost:3000
2. **Add Devices** - Click "Devices" → "Add Device"
3. **Run Discovery** - Click "Discover Devices"
4. **Test Backup** - Click backup button on a device
5. **View Topology** - Click "Top-Viewer"
6. **Check Configs** - Click "View Configs"

## Support

- Check logs: `backend.log` and `frontend.log`
- Review troubleshooting guides
- Ensure Node.js 18+ installed
- Verify ports 8080 and 3000 are available

---

**Velocity Network Manager v2.0** - Enterprise network configuration management.
