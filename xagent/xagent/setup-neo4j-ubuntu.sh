#!/bin/bash

# 🧠 Neo4j Installation Script for Ubuntu Server
# This script installs and configures Neo4j for remote access

set -e  # Exit on error

echo "🚀 Installing Neo4j on Ubuntu Server..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "⚠️  Please run as root or with sudo"
  exit 1
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📍 Server IP: $SERVER_IP"
echo ""

# Install prerequisites
echo "📦 Installing prerequisites..."
apt update
apt install -y wget curl apt-transport-https ca-certificates gnupg

# Add Neo4j repository
echo "📥 Adding Neo4j repository..."
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | tee /etc/apt/sources.list.d/neo4j.list

# Install Neo4j
echo "💾 Installing Neo4j..."
apt update
apt install -y neo4j

# Configure for remote access
echo "⚙️  Configuring Neo4j for remote access..."
sed -i 's/#dbms.default_listen_address=.*/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf
sed -i 's/#dbms.connector.bolt.listen_address=.*/dbms.connector.bolt.listen_address=0.0.0.0:7687/' /etc/neo4j/neo4j.conf
sed -i 's/#dbms.connector.http.listen_address=.*/dbms.connector.http.listen_address=0.0.0.0:7474/' /etc/neo4j/neo4j.conf

# Increase memory limits (optional but recommended)
sed -i 's/#dbms.memory.heap.initial_size=.*/dbms.memory.heap.initial_size=2G/' /etc/neo4j/neo4j.conf
sed -i 's/#dbms.memory.heap.max_size=.*/dbms.memory.heap.max_size=2G/' /etc/neo4j/neo4j.conf
sed -i 's/#dbms.memory.pagecache.size=.*/dbms.memory.pagecache.size=1G/' /etc/neo4j/neo4j.conf

# Configure firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
  echo "🔒 Configuring firewall..."
  ufw allow 7687/tcp comment 'Neo4j Bolt'
  ufw allow 7474/tcp comment 'Neo4j HTTP'
  echo "✅ Firewall rules added"
fi

# Set initial password
echo ""
echo "🔐 Setting Neo4j password..."
echo "Please enter a secure password for Neo4j:"
read -s NEO4J_PASSWORD

systemctl stop neo4j
neo4j-admin set-initial-password "$NEO4J_PASSWORD"

# Start and enable Neo4j
echo ""
echo "🚀 Starting Neo4j..."
systemctl start neo4j
systemctl enable neo4j

# Wait for Neo4j to start
sleep 5

# Check status
echo ""
echo "📊 Neo4j Status:"
systemctl status neo4j --no-pager | head -10

# Display connection info
echo ""
echo "🎉 Neo4j Installation Complete!"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📋 CONNECTION DETAILS:"
echo "═══════════════════════════════════════════════════════"
echo "Browser Interface: http://$SERVER_IP:7474"
echo "Database URI:      bolt://$SERVER_IP:7687"
echo "Username:          neo4j"
echo "Password:          (the one you just set)"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "⚙️  CONFIGURE YOUR XAGENT APP:"
echo "═══════════════════════════════════════════════════════"
echo "Add to your .env file:"
echo ""
echo "VITE_NEO4J_URI=bolt://$SERVER_IP:7687"
echo "VITE_NEO4J_USERNAME=neo4j"
echo "VITE_NEO4J_PASSWORD=your-password"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "🧪 TESTING:"
echo "═══════════════════════════════════════════════════════"
echo "1. Open browser: http://$SERVER_IP:7474"
echo "2. Login with credentials above"
echo "3. Run: npm install neo4j-driver"
echo "4. Update .env file"
echo "5. Restart: npm run dev"
echo ""
echo "✨ Your Knowledge Graph will be fully functional!"
echo "═══════════════════════════════════════════════════════"

