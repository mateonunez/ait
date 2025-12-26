# AIt

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/mateonunez/ait)
[![CI](https://github.com/mateonunez/ait/actions/workflows/ci.yml/badge.svg)](https://github.com/mateonunez/ait/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-24%2B-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.23.0-orange.svg)](https://pnpm.io/)

Hey there! I'm _AIt_ (acts like "alt" /ɔːlt/, but also pronounced as "eight" /eɪt/). It depends.

AIt is a comprehensive platform for interacting with your own data with multiple sources compatible (GitHub, Linear, Spotify, Notion, X, Google, and more soon). AIt brings you AI-capabilities to your own ecosystem.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/mateonunez/ait.git
cd ait
corepack enable
pnpm install

# 2. Start services (PostgreSQL, Qdrant, Ollama, Redis)
pnpm start:services

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your OAuth credentials (see Configuration section)

# 4. Initialize database
pnpm migrate

# 5. Install Ollama models (required for AI features)
docker exec -it ait_ollama ollama pull gemma3:latest # gpt-oss:20b-cloud
docker exec -it ait_ollama ollama pull mxbai-embed-large:latest

# 6. Start development servers
pnpm dev
```

## Architecture

AIt follows a modular monorepo architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   UIt                                       │
│                          (Web Interface - React)                            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               GATEWAY                                       │
│                    (Unified API + OAuth 2.0 Flows)                          │
└───────┬─────────────────────────┬─────────────────────────────┬─────────────┘
        │                         │                             │
        ▼                         ▼                             ▼
┌─────────────────┐       ┌─────────────────┐           ┌─────────────────┐
│  CONNECTORS     │       │    AI SDK       │           │    SCHEDULER    │
│ GitHub,Linear   │       │ RAG, Generation │           │ BullMQ + Redis  │
│ Spotify, X, etc │       │ Tool Calling    │           │ ETL Jobs        │
└───────┬─────────┘       └────────┬────────┘           └────────┬────────┘
        │                          │                             │
        ▼                          ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE LAYER                                │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   PostgreSQL    │     Qdrant      │     Ollama      │        Redis          │
│ (Structured DB) │ (Vector Store)  │  (Local LLM)    │    (Job Queue)        │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘
```

**Data Flow:**

```
OAuth Auth → Connector → PostgreSQL → ETL/Scheduler → Embeddings → Qdrant → RAG → Response
```

### Package Overview

| Package | Path | Description |
|---------|------|-------------|
| **Core** | `packages/core` | Shared utilities, types, errors, HTTP client |
| **Connectors** | `packages/connectors` | OAuth 2.0 integrations (GitHub, Linear, Spotify, X, Notion, Slack, Google Calendar) |
| **Gateway** | `packages/gateway` | Unified API gateway for all connectors |
| **AI SDK** | `packages/infrastructure/ai-sdk` | RAG, text generation, embeddings with Ollama |
| **Store** | `packages/infrastructure/store` | Application data store (conversations, feedback, goals) |
| **Scheduler** | `packages/infrastructure/scheduler` | Automated ETL job scheduling with BullMQ |
| **RetoVe** | `packages/transformers/retove` | ETL pipeline for vector embeddings |
| **UIt** | `packages/uit` | Web interface (React + Vite) |
| **Rocks** | `packages/rocks` | Landing page (React + Vite + Tailwind) |

## Key Features

- **Multi-source Connectors**: GitHub, Linear, Spotify, X, Notion, Slack and more with OAuth 2.0
- **Vector Search**: Qdrant-based semantic search with embeddings
- **Local LLM**: Ollama integration for text generation and embeddings
- **Automated ETL**: Scheduled data synchronization with configurable priorities
- **RAG Pipeline**: Multi-collection retrieval-augmented generation
- **Tool Calling**: AI agents can query your connected services
- **Type-safe**: OpenAPI-generated TypeScript interfaces
- **Observability**: Langfuse integration for LLM monitoring

## Configuration

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

### Required Environment Variables

```bash
# Database
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

# Redis (for job queue)
REDIS_URL=redis://:myredissecret@localhost:6379

# Ollama (for AI features)
OLLAMA_BASE_URL=http://localhost:11434

# Qdrant (for vector search)
QDRANT_URL=http://localhost:6333

# OAuth Credentials (at least one connector)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret

LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_secret

X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_secret

NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_secret

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

See individual package READMEs and [.env.example](.env.example) for all available options.

## Development

### Testing

```bash
pnpm test         # Runs tests with isolated Docker services
pnpm test:watch   # Watch mode for development
```

### Code Generation

```bash
pnpm generate:openapi                              # Generate OpenAPI types
cd packages/infrastructure/postgres && pnpm db:generate  # Generate DB types
```

### Database Management

```bash
pnpm migrate      # Run migrations
pnpm db:studio    # Open database UI (from postgres package)
```

### Linting

```bash
pnpm lint      # Check code with Biome
pnpm lint:fix  # Auto-fix issues
```

### Service Management

```bash
pnpm start:services       # Start all Docker services
pnpm stop:services        # Stop all services
pnpm start:services:test  # Start all Docker services for testing
pnpm stop:services:test   # Stop all services for testing
pnpm clean:services       # Stop and remove volumes
pnpm clean:all            # Full cleanup (node_modules, dist, services)
```

## Package Documentation

| Package | Description |
|---------|-------------|
| [Core](packages/core/README.md) | Shared utilities and types |
| [Gateway](packages/gateway/README.md) | API gateway and OAuth authentication |
| [Connectors](packages/connectors/README.md) | Platform integrations framework |
| [AI SDK](packages/infrastructure/ai-sdk/README.md) | RAG and text generation |
| [Store](packages/infrastructure/store/README.md) | Data persistence for conversations, feedback, goals |
| [Scheduler](packages/infrastructure/scheduler/README.md) | ETL job scheduling |
| [ETL Pipeline](packages/transformers/retove/README.md) | Data transformation |
| [PostgreSQL](packages/infrastructure/postgres/README.md) | Database client |
| [Qdrant](packages/infrastructure/qdrant/README.md) | Vector database |
| [Ollama](packages/infrastructure/ollama/README.md) | LLM service setup |
| [Redis](packages/infrastructure/redis/README.md) | Job queue and caching |
| [UIt](packages/uit/README.md) | Web interface |
| [Rocks](packages/rocks/README.md) | Landing page |

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6333  # Qdrant
lsof -i :11434 # Ollama
lsof -i :6379  # Redis

# Reset everything and start fresh
pnpm clean:all
pnpm install
pnpm start:services
```

### Database connection errors

```bash
# Verify PostgreSQL is healthy
docker exec ait_postgres pg_isready -U root -d ait

# Check connection URL matches docker-compose
echo $POSTGRES_URL  # Should be: postgresql://root:toor@localhost:5432/ait

# Re-run migrations
pnpm migrate
```

### Ollama model not found

```bash
# List installed models
docker exec ait_ollama ollama list

# Pull required models
docker exec -it ait_ollama ollama pull gemma3:latest 
docker exec -it ait_ollama ollama pull mxbai-embed-large:latest
```

### OAuth callback errors

```bash
# Ensure HTTPS is configured for OAuth providers that require it
cd packages/gateway
npm run cert:generate
npm run cert:trust  # macOS only

# Set USE_HTTPS=true in your .env
```

### Out of memory with Ollama

```bash
# Use smaller models
docker exec -it ait_ollama ollama pull gemma3:1b  # Smaller variant

# Or increase Docker memory limits in Docker Desktop settings
```

### OpenAPI types missing

```bash
# Regenerate types
pnpm generate:openapi
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and how to submit pull requests.

## License

[MIT](LICENSE)
