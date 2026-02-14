# 🔧 Troubleshooting Guide - Based on Your Screenshot

## Issues Found in Your Screenshot

### ✅ What's Working
- Backend: Online (green) ✓
- Dashboard loads ✓
- Live logs visible ✓
- Sidebar navigation works ✓

### ❌ Issues Detected

#### 1. WebSocket Disconnected (Red Dot)
**Symptom:** Red dot next to "WebSocket:" status

**Possible Causes:**
- Port mismatch (you're on port 3001, app expects 3000)
- Backend WebSocket not starting
- CORS/connection blocked

**Fix:**

Check browser console (F12) for errors like:
```
WebSocket connection to 'ws://localhost:8080' failed
```

**Solution A - Use Correct Port:**
```bash
# Make sure you access the app on port 3000:
http://localhost:3000

# NOT port 3001
```

**Solution B - Check Backend:**
```bash
# Make sure backend is running:
curl http://localhost:8080/api/v1/health

# Should return: {"status":"ok",...}
```

**Solution C - Restart Both Services:**
```bash
# Stop everything (Ctrl+C)
# Then restart:
./start-all.sh
```

#### 2. Topology Scan Errors
**Error Seen:**
```
Topology scan failed: generateIPsInSubnet is not a function
```

**This is CRITICAL** - I've fixed this in the new package!

**Quick Fix (Without Downloading New Package):**

Edit `backend/utils/network-scanner.js` and change the last few lines from:
```javascript
module.exports = {
  discoverDevices,
  detectLocalSubnet,
  checkPort,
  scanHost
};
```

To:
```javascript
module.exports = {
  discoverDevices,
  detectLocalSubnet,
  checkPort,
  scanHost,
  parseSubnet,
  generateIPsInSubnet
};
```

Then restart backend.

## Common Issues & Solutions

### Issue: "Retrieved 0 devices" in Logs

**This is NORMAL if:**
- You haven't added any devices yet
- You're just starting out

**To fix:**
1. Click "Manage Devices" (or go to Devices page)
2. Click "Add Device" button
3. Fill in:
   - Hostname: e.g., "Router-1"
   - IP Address: e.g., "192.168.1.1"
   - Vendor: Choose (Cisco, Ubiquiti, Aruba)
   - Protocol: SSH or Telnet
   - Port: 22 (SSH) or 23 (Telnet)
   - Username: your device username
   - Password: your device password
4. Click Save

### Issue: Port 3001 vs 3000

**I noticed you're accessing:** `localhost:3001/#/dashboard`

**App should be on:** `localhost:3000`

**Why this matters:**
- Frontend defaults to port 3000
- WebSocket connects to localhost:8080
- If you're on wrong port, WebSocket won't work

**Fix:**
```bash
# Access the correct URL:
http://localhost:3000
```

If port 3000 is taken:
```bash
# Check what's using it:
lsof -i :3000

# Kill it:
kill -9 <PID>

# Or change Vite port in frontend/vite.config.ts
```

### Issue: "No logs yet"

**If live logs section is empty:**
1. Perform any action (add device, run discovery, backup)
2. Logs will appear automatically
3. Backend must be running and connected

### Issue: Stats Show 0/0/0

**This is normal for a fresh install!**

To get real data:
1. **Add devices** → Total Devices will increase
2. **Create templates** → Templates count increases  
3. **Run backups** → Total Backups increases

## How to Test Everything Works

### Test 1: Add a Device
```
1. Click "Devices" in sidebar
2. Click "Add Device"
3. Fill in details
4. Click Save
5. Should see device in list with 💾 Backup button
```

### Test 2: Run Discovery
```
1. Click "🔍 Discover Devices" on dashboard
2. Enter your subnet (e.g., 192.168.1.0/24)
3. Click "Start Scan"
4. Watch live logs for progress
5. See discovered devices
```

### Test 3: Backup a Device
```
1. Go to Devices page
2. Click 💾 Backup button
3. Should see notification in bottom-right
4. Progress bar appears
5. Notification shows completion
6. Check "View Configs" to see backup
```

### Test 4: Topology (After Fix)
```
1. Apply the topology fix (see above)
2. Restart backend
3. Click "🗺️ Top-Viewer"
4. Enter subnet: 192.168.50.0/24
5. Click "Scan Network"
6. Should see progress bar
7. Devices appear as nodes on map
```

### Test 5: View Configs
```
1. After running a backup
2. Click "📁 View Configs"
3. Sidebar opens from right
4. See list of backups
5. Click one to view content
6. Download button should work
```

## Verification Checklist

After applying fixes, verify:

- [ ] Access app at `http://localhost:3000` (not 3001)
- [ ] Backend status: Green (online)
- [ ] WebSocket status: Green (connected) - NOT RED
- [ ] Can add a device
- [ ] Backup button appears on devices
- [ ] Clicking backup shows notification
- [ ] Config sidebar opens
- [ ] Top-Viewer opens without errors
- [ ] Live logs update in real-time

## Still Having Issues?

### Check Backend Logs
```bash
# In the backend terminal, look for:
✓ Database initialized
✓ Backup scheduler initialized
✓ Server listening on port 8080
Client connected: <socket-id>
```

### Check Browser Console
```bash
# Press F12 in browser
# Check Console tab for:
WebSocket connected  ← Should see this
Connected to Velocity v2.0  ← And this
```

### Restart Everything
```bash
# Stop all (Ctrl+C in both terminals)
# Then:
./start-all.sh

# Wait for both to start
# Access: http://localhost:3000
```

## What Should Work Now

With the fixes applied:

✅ **WebSocket** - Green dot, real-time updates  
✅ **Topology** - Scans work, map displays  
✅ **Backups** - Progress notifications  
✅ **Live Logs** - Updates automatically  
✅ **Discovery** - Finds devices  
✅ **Config Sidebar** - View/download backups  

## Quick Reference

| Feature | How to Access | Expected Behavior |
|---------|--------------|-------------------|
| Live Logs | Always visible on dashboard | Updates in real-time |
| Add Device | Devices → Add Device | Form opens, save works |
| Backup | Devices → 💾 Backup button | Notification appears |
| Discovery | Dashboard → 🔍 Discover | Panel opens, scan works |
| Topology | Dashboard → 🗺️ Top-Viewer | Full-screen map, scan works |
| Configs | Dashboard → 📁 View Configs | Sidebar opens from right |

---

**After applying the fixes, everything should work perfectly! 🎉**
