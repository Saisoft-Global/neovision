#!/bin/bash

# Start all services
docker-compose up -d

# Wait for Neo4j to be healthy
echo "Waiting for Neo4j to be ready..."
until docker exec multi-agent-neo4j cypher-shell -u neo4j -p yourpassword "RETURN 1;" > /dev/null 2>&1; do
  sleep 1
done

# Wait for Backend to be healthy
echo "Waiting for Backend API to be ready..."
until curl -f http://localhost:8000/health > /dev/null 2>&1; do
  sleep 1
done

# Initialize Neo4j schema
docker exec multi-agent-neo4j cypher-shell -u neo4j -p yourpassword "
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE;
CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.type);
CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.label);
"

# Pull Ollama models
echo "Pulling required Ollama models..."
docker exec multi-agent-ollama ollama pull llama2
docker exec multi-agent-ollama ollama pull codellama
docker exec multi-agent-ollama ollama pull mistral

echo "All services are ready!"