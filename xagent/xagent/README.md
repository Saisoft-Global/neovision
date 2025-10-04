# Multi-Agent Platform

A comprehensive platform for building and managing AI agents with advanced knowledge management, workflow automation, and integration capabilities.

## Features

- 🤖 Multiple specialized AI agents (HR, Finance, IT, etc.)
- 📚 Advanced knowledge management with Neo4j graph database
- 🔄 Automated workflow orchestration
- 🧠 Local LLM support via Ollama
- 📊 Real-time analytics and monitoring
- 🔒 Robust security and access control
- 🔌 Third-party service integrations
- 📝 Document processing with OCR support

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- 16GB RAM minimum (32GB recommended)
- GPU recommended for Ollama LLM support

## Quick Start

1. Clone the repository
2. Copy environment file:
   ```bash
   cp render.env.template .env
   ```
3. Update `.env` with your configuration (API keys, database URLs, etc.)
4. Start all services with Docker Compose:
   ```bash
   docker-compose up -d
   ```
5. Access the application:
   - Frontend: http://localhost:8085
   - Backend API: http://localhost:8000
   - Neo4j Browser: http://localhost:7474
   - Ollama API: http://localhost:11434

## Development Mode

For development with hot reloading:

```bash
# Terminal 1: Start infrastructure services
docker-compose up -d neo4j ollama sqlite

# Terminal 2: Start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 3: Start frontend
npm install
npm run dev
```

## Deploy to Render

See [DEPLOY.md](./DEPLOY.md) for complete deployment instructions to Render.

## Architecture

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Python
- Vector Store: Pinecone (optional)
- Graph Database: Neo4j
- Local Storage: SQLite
- LLM Support: OpenAI API + Ollama
- Container Orchestration: Docker Compose

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run backup` - Create database backups

## Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## License

MIT