#!/bin/bash

# Node.js Version Fix Script for Velocity Network Manager
# This script helps fix Node.js compatibility issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Velocity - Node.js Compatibility Checker${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Get current Node version
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js first:"
    echo "  Visit: https://nodejs.org/"
    exit 1
fi

CURRENT_VERSION=$(node --version)
NODE_MAJOR=$(echo $CURRENT_VERSION | cut -d'.' -f1 | tr -d 'v')

echo -e "Current Node.js version: ${YELLOW}$CURRENT_VERSION${NC}"
echo ""

# Check version compatibility
if [ "$NODE_MAJOR" -eq 20 ] || [ "$NODE_MAJOR" -eq 18 ]; then
    echo -e "${GREEN}✓ Your Node.js version is compatible!${NC}"
    echo ""
    echo "Proceeding with clean installation..."
    
    # Clean and install
    cd backend
    echo "Removing old node_modules..."
    rm -rf node_modules package-lock.json
    
    echo "Installing dependencies..."
    npm install
    
    echo ""
    echo -e "${GREEN}✓ Backend dependencies installed successfully!${NC}"
    echo ""
    echo "Now install frontend:"
    echo "  cd ../frontend"
    echo "  npm install"
    exit 0
fi

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}✗ Node.js $CURRENT_VERSION is too old${NC}"
    echo -e "${YELLOW}  Minimum required: v18.x${NC}"
    echo -e "${YELLOW}  Recommended: v20.x (LTS)${NC}"
elif [ "$NODE_MAJOR" -gt 20 ]; then
    echo -e "${YELLOW}⚠️  Node.js v$NODE_MAJOR is very new and may have compatibility issues${NC}"
    echo -e "${YELLOW}  Recommended: v20.x (LTS)${NC}"
fi

echo ""
echo "Would you like to install Node.js 20 LTS using NVM? (y/n)"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Installation cancelled."
    echo ""
    echo "To fix manually:"
    echo "  1. Install Node.js 20 LTS from https://nodejs.org/"
    echo "  2. Run: cd backend && rm -rf node_modules package-lock.json && npm install"
    exit 1
fi

echo ""
echo -e "${BLUE}Installing Node.js 20 LTS via NVM...${NC}"
echo ""

# Check if NVM is already installed
if command -v nvm &> /dev/null; then
    echo -e "${GREEN}✓ NVM already installed${NC}"
else
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    # Load NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    echo -e "${GREEN}✓ NVM installed${NC}"
fi

# Source NVM (in case it wasn't loaded)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo ""
echo "Installing Node.js 20 LTS..."
nvm install 20

echo ""
echo "Switching to Node.js 20..."
nvm use 20

echo ""
NEW_VERSION=$(node --version)
echo -e "${GREEN}✓ Now using Node.js $NEW_VERSION${NC}"

echo ""
echo "Cleaning and installing backend dependencies..."
cd backend
rm -rf node_modules package-lock.json
npm install

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "Node.js 20 is now installed and configured."
echo ""
echo "IMPORTANT: To use Node.js 20 in future terminal sessions:"
echo -e "  ${YELLOW}nvm use 20${NC}"
echo ""
echo "Or set it as default:"
echo -e "  ${YELLOW}nvm alias default 20${NC}"
echo ""
echo "Next steps:"
echo "  1. Install frontend: cd ../frontend && npm install"
echo "  2. Start backend: cd ../backend && npm start"
echo "  3. Start frontend: cd ../frontend && npm run dev"
echo ""
