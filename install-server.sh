#!/bin/bash
# DeadMinecraft Server Installation Script (packwiz version)
# Using packwiz - a simple, Go-based mod manager

set -e

echo "=========================================="
echo "  DeadMinecraft Server Setup"
echo "  Bot-Optimized Fabric Server"
echo "=========================================="
echo ""

# Configuration
MC_VERSION="1.21.4"
SERVER_DIR="deadminecraft-server"
MEMORY_MIN="4G"
MEMORY_MAX="8G"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for Java
echo -e "${BLUE}Checking Java installation...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${RED}Java is not installed. Please install Java 21+ first.${NC}"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo -e "${RED}Java 21+ required. You have Java $JAVA_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java $JAVA_VERSION detected${NC}"

# Check for packwiz
echo -e "${BLUE}Checking for packwiz...${NC}"
if ! command -v packwiz &> /dev/null; then
    echo -e "${YELLOW}packwiz not found. Installing...${NC}"
    
    # Check for go
    if ! command -v go &> /dev/null; then
        echo -e "${RED}Go is required to install packwiz${NC}"
        echo -e "${YELLOW}Install Go from: https://go.dev/dl/${NC}"
        echo ""
        echo "Quick install:"
        echo "  wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz"
        echo "  sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz"
        echo '  export PATH=$PATH:/usr/local/go/bin'
        exit 1
    fi
    
    echo -e "${BLUE}Installing packwiz via go...${NC}"
    go install github.com/packwiz/packwiz@latest
    
    # Add to PATH if not already
    export PATH=$PATH:$(go env GOPATH)/bin
    echo -e "${GREEN}✓ packwiz installed${NC}"
else
    echo -e "${GREEN}✓ packwiz found${NC}"
fi

# Create server directory
echo -e "${BLUE}Creating server directory...${NC}"
mkdir -p "$SERVER_DIR"
cd "$SERVER_DIR"

# Initialize packwiz
echo -e "${BLUE}Initializing packwiz modpack...${NC}"
packwiz init --name "DeadMinecraft" --author "YourName" --version "1.0.0" --mc-version "$MC_VERSION" --modloader fabric

# Add all the mods
echo -e "${BLUE}Adding performance mods...${NC}"

# Essential
packwiz mr add fabric-api
packwiz mr add lithium

# Monitoring
packwiz mr add spark
packwiz mr add servercore

# Bot utilities
packwiz mr add carpet
packwiz mr add chunky
packwiz mr add ledger

# Visualization
packwiz mr add dynmap

echo -e "${GREEN}✓ All mods added to pack.toml${NC}"

# Download Fabric server
echo -e "${BLUE}Downloading Fabric server...${NC}"
if [ ! -f "fabric-server-launch.jar" ]; then
    FABRIC_INSTALLER_URL="https://meta.fabricmc.net/v2/versions/loader/$MC_VERSION/0.16.9/1.0.1/server/jar"
    wget -q --show-progress "$FABRIC_INSTALLER_URL" -O fabric-server-launch.jar
    echo -e "${GREEN}✓ Fabric server downloaded${NC}"
fi

# Download packwiz-installer bootstrap
echo -e "${BLUE}Downloading packwiz-installer bootstrap...${NC}"
BOOTSTRAP_URL="https://github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar"
wget -q --show-progress "$BOOTSTRAP_URL" -O packwiz-installer-bootstrap.jar
echo -e "${GREEN}✓ packwiz-installer bootstrap downloaded${NC}"

# Create mods directory
mkdir -p mods

# Run packwiz-installer to download all mods
echo -e "${BLUE}Downloading all mods via packwiz-installer...${NC}"
java -jar packwiz-installer-bootstrap.jar -g -s server pack.toml
echo -e "${GREEN}✓ All mods downloaded to mods/ folder${NC}"

# Create server.properties
echo -e "${BLUE}Creating server.properties...${NC}"
cat > server.properties << EOF
# DeadMinecraft Server Configuration
online-mode=false
max-players=1000
server-port=25565
motd=DeadMinecraft - Bot Simulation
view-distance=8
simulation-distance=6
network-compression-threshold=256
max-tick-time=60000
sync-chunk-writes=false
spawn-protection=0
pvp=false
difficulty=peaceful
spawn-animals=false
spawn-monsters=false
spawn-npcs=false
level-name=world
generate-structures=false
allow-flight=true
white-list=false
enforce-whitelist=false
enable-command-block=true
function-permission-level=4
EOF

echo -e "${GREEN}✓ server.properties created${NC}"

# Create eula.txt
cat > eula.txt << EOF
eula=true
EOF

# Create start script that auto-updates mods
echo -e "${BLUE}Creating start script...${NC}"
cat > start.sh << 'STARTEOF'
#!/bin/bash

echo "Checking for mod updates..."
java -jar packwiz-installer-bootstrap.jar -g -s server pack.toml

echo "Starting server..."
java -Xms4G -Xmx8G \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UnlockExperimentalVMOptions \
  -XX:+DisableExplicitGC \
  -XX:+AlwaysPreTouch \
  -XX:G1NewSizePercent=30 \
  -XX:G1MaxNewSizePercent=40 \
  -XX:G1HeapRegionSize=8M \
  -XX:G1ReservePercent=20 \
  -XX:G1HeapWastePercent=5 \
  -XX:G1MixedGCCountTarget=4 \
  -XX:InitiatingHeapOccupancyPercent=15 \
  -XX:G1MixedGCLiveThresholdPercent=90 \
  -XX:G1RSetUpdatingPauseTimePercent=5 \
  -XX:SurvivorRatio=32 \
  -XX:+PerfDisableSharedMem \
  -XX:MaxTenuringThreshold=1 \
  -jar fabric-server-launch.jar nogui
STARTEOF

chmod +x start.sh

# Create start script without auto-update (faster startup)
cat > start-fast.sh << 'STARTEOF'
#!/bin/bash
echo "Starting server (skipping mod update check)..."
java -Xms4G -Xmx8G \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UnlockExperimentalVMOptions \
  -XX:+DisableExplicitGC \
  -XX:+AlwaysPreTouch \
  -XX:G1NewSizePercent=30 \
  -XX:G1MaxNewSizePercent=40 \
  -XX:G1HeapRegionSize=8M \
  -XX:G1ReservePercent=20 \
  -XX:G1HeapWastePercent=5 \
  -XX:G1MixedGCCountTarget=4 \
  -XX:InitiatingHeapOccupancyPercent=15 \
  -XX:G1MixedGCLiveThresholdPercent=90 \
  -XX:G1RSetUpdatingPauseTimePercent=5 \
  -XX:SurvivorRatio=32 \
  -XX:+PerfDisableSharedMem \
  -XX:MaxTenuringThreshold=1 \
  -jar fabric-server-launch.jar nogui
STARTEOF

chmod +x start-fast.sh

# Create update script
cat > update-mods.sh << 'EOF'
#!/bin/bash
echo "Updating all mods in pack.toml..."
packwiz update --all

echo "Downloading updated mods..."
java -jar packwiz-installer-bootstrap.jar -g -s server pack.toml

echo "Done! Restart the server to apply changes."
EOF
chmod +x update-mods.sh

# Create add mod script
cat > add-mod.sh << 'EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./add-mod.sh <mod-slug>"
    echo "Example: ./add-mod.sh sodium"
    exit 1
fi

echo "Adding mod: $1"
packwiz mr add "$1"

echo "Downloading mod..."
java -jar packwiz-installer-bootstrap.jar -g -s server pack.toml

echo "Mod added and downloaded!"
EOF
chmod +x add-mod.sh

# Create README
cat > README.txt << EOF
========================================
DeadMinecraft Server - Setup Complete!
========================================

Packwiz is managing your mods!

NEXT STEPS:
===========

1. Start the server:
   ./start.sh       (checks for mod updates first)
   ./start-fast.sh  (skips update check, faster)

2. Access Dynmap:
   http://localhost:8123

3. Launch bots:
   cd ..
   bun farmer-bot.js

COMMANDS:
=========

Start server:       ./start.sh
Start (fast):       ./start-fast.sh
Update mods:        ./update-mods.sh
Add mod:            ./add-mod.sh <slug>
List mods:          packwiz list

HOW IT WORKS:
=============

- pack.toml contains mod metadata
- packwiz-installer-bootstrap.jar downloads actual .jar files
- start.sh runs the installer before launching (auto-updates)
- start-fast.sh skips the check for faster startup

PACKWIZ COMMANDS:
=================

Update all:      packwiz update --all
Add from MR:     packwiz mr add <slug>
Add from CF:     packwiz cf add <slug>
Remove:          packwiz remove <mod>
Refresh:         packwiz refresh

INSTALLED MODS:
===============

Performance:
- Fabric API, Lithium

Monitoring:
- Spark, ServerCore

Bot Tools:
- Carpet, Chunky, Ledger

Visualization:
- Dynmap (localhost:8123)

SERVER INFO:
============

Port: 25565
Dynmap: http://localhost:8123
TPS: /tps (Carpet mod)
Profile: /spark profiler

Enjoy your bot world!
EOF

echo ""
echo -e "${GREEN}=========================================="
echo "  Installation Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Server location:${NC} $(pwd)"
echo ""
echo -e "${BLUE}To start:${NC}"
echo "  ./start.sh       # with mod update check"
echo "  ./start-fast.sh  # without update check"
echo ""
echo -e "${BLUE}Dynmap:${NC}"
echo "  http://localhost:8123"
echo ""
echo "In your deadminecraft-server directory you may need to run the following to use java 21+:"
echo "sed -i 's|java -|/usr/lib/jvm/java-21-openjdk/bin/java -|g' start.sh"
echo "sed -i 's|java -|/usr/lib/jvm/java-21-openjdk/bin/java -|g' start-fast.sh"
echo ""
echo -e "${GREEN}Read README.txt for more info${NC}"
echo ""