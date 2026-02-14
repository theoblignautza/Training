# Velocity Network Manager - QUICK START

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Start the Application

**Option A: Using start script (Recommended)**
```bash
chmod +x start.sh
./start.sh
```

**Option B: Manual start**

Terminal 1 (Backend):
```bash
cd backend
npm start
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Step 3: Access Application

Open browser to: **http://localhost:3000**

You should see:
- ✅ Backend: Online (green dot)
- ✅ WebSocket: Connected (green dot)

---

## 🎯 First Tasks

### Add Your First Device

1. Go to **Devices** page (sidebar)
2. Click **"Add Device"**
3. Fill in:
   - Hostname: `Switch1`
   - IP Address: `192.168.1.10`
   - Protocol: **SSH** (or Telnet)
   - Port: `22` (auto-filled)
   - Username: `admin`
   - Password: `admin`
4. Click **"Save Device"**

### Backup a Device

1. Find your device in the list
2. Click **"Backup"** button
3. Watch the live logs (dashboard)
4. Configuration saved!

### Discover Devices

1. Go to **Dashboard**
2. Click **"Discover Devices"**
3. Enter subnet: `192.168.1.0/24`
4. Click **"Start Scan"**
5. Wait for results
6. Select devices and click **"Add Selected"**

---

## 🔧 Troubleshooting

### Backend Won't Start

```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill process if needed
kill $(lsof -ti :8080)

# Try starting again
cd backend
npm start
```

### Frontend Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill $(lsof -ti :3000)

# Try starting again
cd frontend
npm run dev
```

### "Backend Offline" Error

1. Make sure backend is running on port 8080
2. Check terminal for errors
3. Try: `curl http://localhost:8080/api/v1/health`
4. Should return: `{"status":"ok"}`

---

## 📱 Access from Another Device

### Find Your Server IP

```bash
# Linux/Mac
ip addr show | grep inet

# Windows
ipconfig
```

### Update Frontend Config

Edit `frontend/services/api.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_IP:8080/api/v1';
```

Edit `frontend/hooks/useWebSocket.tsx`:
```typescript
const SOCKET_URL = 'http://YOUR_IP:8080';
```

Example:
```typescript
const API_BASE_URL = 'http://192.168.1.100:8080/api/v1';
const SOCKET_URL = 'http://192.168.1.100:8080';
```

Rebuild frontend:
```bash
cd frontend
npm run build
npm run preview
```

Access from any device: **http://YOUR_IP:3000**

---

## 📚 Next Steps

- Read **README.md** for complete documentation
- Read **CHANGES.md** for list of all features
- Check **backend/routes/** for API endpoints
- Explore live logs feature
- Try backup and restore
- Set up scheduled backups

---

## 🆘 Need Help?

Common issues and solutions in **README.md** → Troubleshooting section

Check logs:
```bash
# Backend logs
tail -f backend/logs/*.log

# Or watch live logs in the UI
Dashboard → "View Live Logs"
```

---

## ✅ You're Ready!

Your Velocity Network Manager is now running with:

- ✅ Network device discovery
- ✅ Configuration backup
- ✅ Configuration restore
- ✅ Live log streaming
- ✅ SSH and Telnet support
- ✅ LAN accessibility

**Happy managing! 🎉**
