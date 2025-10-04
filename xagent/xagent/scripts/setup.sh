#!/bin/bash

# Make scripts executable
chmod +x scripts/*.sh

# Create necessary directories
mkdir -p data/sqlite/backups
mkdir -p backups

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file. Please update with your configuration."
fi

# Install dependencies
npm install

# Start services
./scripts/start-services.sh

# Initialize database
./scripts/init-db.sh

echo "Setup completed! You can now start the application with: npm run dev"