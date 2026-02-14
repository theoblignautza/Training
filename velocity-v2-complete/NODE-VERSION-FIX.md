# Node.js Compatibility Fix

## Problem
You're encountering a compilation error with `better-sqlite3` because you're using **Node.js v24.13.0**, which is very new and has C++20 requirements that older native modules don't support yet.

## Error Message
```
error: #error "C++20 or later required."
npm error gyp ERR! build error
```

## Solutions (Choose One)

### Solution 1: Use Node.js 20 LTS (Recommended)

Node.js 20 LTS is the current stable long-term support version and is fully compatible with all dependencies.

#### Install Node.js 20 LTS using NVM (Recommended)

```bash
# Install NVM if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20 LTS
nvm install 20

# Use Node.js 20
nvm use 20

# Verify version
node --version  # Should show v20.x.x

# Now install backend dependencies
cd ~/Music/TAO\ BACKUP/velocity-complete/backend
rm -rf node_modules package-lock.json
npm install
```

#### Or Install Node.js 20 LTS Directly

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

**After installing Node.js 20:**
```bash
cd ~/Music/TAO\ BACKUP/velocity-complete/backend
rm -rf node_modules package-lock.json
npm install
```

### Solution 2: Keep Node.js 24 (Try Updated Package)

I've updated the `package.json` to use `better-sqlite3@11.7.0` which has better Node.js 24 support.

```bash
cd ~/Music/TAO\ BACKUP/velocity-complete/backend

# Clean previous install attempts
rm -rf node_modules package-lock.json

# Make sure you have build tools
sudo apt-get update
sudo apt-get install -y build-essential python3

# Try installing again
npm install
```

If this still fails, proceed to Solution 1 (use Node.js 20).

### Solution 3: Alternative Database (If Others Fail)

If both solutions above fail, you can use an alternative:

**Update `backend/package.json` to use `sql.js` (pure JavaScript, no compilation):**

This is a fallback option but slower than better-sqlite3.

---

## Quick Fix Script

Save this as `fix-node-version.sh`:

```bash
#!/bin/bash

echo "Current Node.js version: $(node --version)"

NODE_MAJOR=$(node --version | cut -d'.' -f1 | tr -d 'v')

if [ "$NODE_MAJOR" -gt 20 ]; then
    echo "⚠️  Warning: You're using Node.js v$NODE_MAJOR which may have compatibility issues"
    echo "   Recommended: Node.js 20 LTS"
    echo ""
    echo "Install Node.js 20 LTS? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Install NVM
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Install Node 20
        nvm install 20
        nvm use 20
        
        echo "✓ Node.js 20 installed"
        echo "  Run: nvm use 20"
        echo "  Then: cd backend && npm install"
    fi
else
    echo "✓ Node.js version is compatible"
    echo "  Proceeding with installation..."
    cd backend
    rm -rf node_modules package-lock.json
    npm install
fi
```

Then run:
```bash
chmod +x fix-node-version.sh
./fix-node-version.sh
```

---

## Recommended Approach

**For production stability, use Node.js 20 LTS:**

1. Install Node.js 20 LTS via NVM (as shown above)
2. Use `nvm use 20` whenever working on this project
3. Clean install: `rm -rf node_modules package-lock.json && npm install`

---

## After Fixing

Once Node.js is compatible:

```bash
# Clean install
cd ~/Music/TAO\ BACKUP/velocity-complete/backend
rm -rf node_modules package-lock.json
npm install

# Test
npm start

# Should see:
# ═══════════════════════════════════════════════════════
#  Velocity Network Manager Backend
# ═══════════════════════════════════════════════════════
# Server running on: http://0.0.0.0:8080
```

---

## Why This Happens

- **Node.js 24** is bleeding-edge (released late 2024)
- Uses **C++20 standard** for native modules
- Native modules like `better-sqlite3` need to be recompiled
- Older versions (like 9.2.2) weren't built for C++20

**Node.js 20 LTS** is the stable, production-ready version that all packages support.

---

## Verify Everything Works

```bash
# Check Node version
node --version  # Should be v20.x.x

# Check npm version
npm --version

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install

# Start backend
cd ../backend
npm start
```

You should see the server start successfully! 🚀
