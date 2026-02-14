# 🚨 QUICK FIX: Node.js v24 Compatibility Issue

## Your Problem
Node.js v24.13.0 is too new! The `better-sqlite3` package can't compile with it.

## ⚡ Instant Fix (Choose One)

### Option 1: Automated Fix (Easiest)

```bash
cd ~/Music/TAO\ BACKUP/velocity-complete
chmod +x fix-node-version.sh
./fix-node-version.sh
```

This script will:
- ✓ Install Node.js 20 LTS via NVM
- ✓ Clean and install all dependencies
- ✓ Get you running in minutes

---

### Option 2: Manual Fix (3 Steps)

**Step 1: Install Node.js 20 LTS**
```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x
```

**Step 2: Clean Install Backend**
```bash
cd ~/Music/TAO\ BACKUP/velocity-complete/backend
rm -rf node_modules package-lock.json
npm install
```

**Step 3: Install Frontend**
```bash
cd ../frontend
npm install
```

---

### Option 3: System-Wide Node.js 20 Install

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version

# Then clean install
cd ~/Music/TAO\ BACKUP/velocity-complete/backend
rm -rf node_modules package-lock.json
npm install
```

---

## Why This Happens

- **Your Node.js**: v24.13.0 (too new, requires C++20)
- **Package needs**: Node.js 18-20 (uses C++17)
- **Solution**: Use Node.js 20 LTS (stable, tested, compatible)

## After Fix - Start the App

```bash
# Terminal 1: Backend
cd ~/Music/TAO\ BACKUP/velocity-complete/backend
npm start

# Terminal 2: Frontend
cd ~/Music/TAO\ BACKUP/velocity-complete/frontend
npm run dev
```

Open browser: http://localhost:3000

---

## If You Get Errors

**"nvm: command not found"**
```bash
source ~/.bashrc
# or
source ~/.zshrc
```

**Permission denied**
```bash
# Don't use sudo with npm when using NVM
# Just use: npm install
```

**Still failing?**
```bash
# Make sure you're using Node 20
nvm use 20

# Check version
node --version  # Must be v20.x.x

# Try again
cd backend
rm -rf node_modules package-lock.json node_modules
npm cache clean --force
npm install
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `nvm install 20` | Install Node.js 20 |
| `nvm use 20` | Switch to Node.js 20 |
| `nvm alias default 20` | Make Node.js 20 default |
| `node --version` | Check current version |
| `rm -rf node_modules package-lock.json` | Clean install |

---

## Need More Help?

See detailed guide: **NODE-VERSION-FIX.md**

---

**TL;DR:** Run `./fix-node-version.sh` - it does everything for you! 🚀
