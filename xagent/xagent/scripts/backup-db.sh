#!/bin/bash

# Get current date for backup file name
DATE=$(date +%Y%m%d_%H%M%S)

# Create Neo4j backup
docker exec multi-agent-neo4j neo4j-admin dump --database=neo4j \
  --to=/backups/neo4j_backup_$DATE.dump

# Backup SQLite database
docker exec multi-agent-sqlite sqlite3 /data/local.db ".backup '/data/backups/sqlite_backup_$DATE.db'"

echo "Backup completed: $DATE"