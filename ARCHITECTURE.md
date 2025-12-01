# AIt Architecture

This document describes the technical architecture of AIt, a platform for AI-powered interactions with your personal data ecosystem.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Package Structure](#package-structure)
- [Infrastructure](#infrastructure)
- [Security Model](#security-model)
- [Extensibility](#extensibility)

## Overview

AIt is designed as a modular monorepo that enables users to connect their data sources (GitHub, Spotify, Linear, X, etc.) and interact with that data using AI capabilities powered by local LLMs.

### Design Principles

1. **Local-First AI**: LLM processing runs locally via Ollama, keeping data private
2. **Modular Architecture**: Each component is independently deployable and testable
3. **Type Safety**: Full TypeScript with OpenAPI-generated types
4. **Semantic Search**: Vector embeddings enable intelligent data retrieval
5. **Extensible Connectors**: Plugin architecture for adding new data sources

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                           UIt (Web Interface)                                │  │
│  │                    React + Vite • http://localhost:5173                      │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────┬───────────────────────────────────────────┘
                                         │ HTTP/REST
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                    API LAYER                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                          Gateway (API Server)                                │  │
│  │              Fastify • OAuth 2.0 • https://localhost:3000                    │  │
│  │                                                                              │  │
│  │   /api/github/*  /api/spotify/*  /api/linear/*  /api/x/*  /api/chat/*       │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└─────────┬─────────────────┬──────────────────┬─────────────────┬───────────────────┘
          │                 │                  │                 │
          ▼                 ▼                  ▼                 ▼
┌─────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────┐
│   CONNECTORS    │ │   AI SDK      │ │   SCHEDULER   │ │        RETOVE (ETL)       │
│                 │ │               │ │               │ │                           │
│ • GitHub        │ │ • Generation  │ │ • BullMQ      │ │ • Extract from PostgreSQL │
│ • Spotify       │ │ • Embeddings  │ │ • Cron Jobs   │ │ • Transform to Embeddings │
│ • Linear        │ │ • RAG         │ │ • Priorities  │ │ • Load into Qdrant        │
│ • X (Twitter)   │ │ • Tools       │ │ • Retries     │ │                           │
│ • Notion        │ │ • Pipelines   │ │               │ │                           │
│ • Slack         │ │               │ │               │ │                           │
│ • Google        │ │               │ │               │ │                           │
└────────┬────────┘ └───────┬───────┘ └───────┬───────┘ └─────────────┬─────────────┘
         │                  │                 │                       │
         └──────────────────┼─────────────────┼───────────────────────┘
                            │                 │
                            ▼                 ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              INFRASTRUCTURE LAYER                                  │
│                                                                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  PostgreSQL   │  │    Qdrant     │  │    Ollama     │  │     Redis     │       │
│  │               │  │               │  │               │  │               │       │
│  │ • OAuth Tokens│  │ • Embeddings  │  │ • gemma3      │  │ • Job Queue   │       │
│  │ • User Data   │  │ • Collections │  │ • mxbai-embed │  │ • BullMQ      │       │
│  │ • Sync State  │  │ • Similarity  │  │ • Tool Calls  │  │ • Caching     │       │
│  │               │  │   Search      │  │               │  │               │       │
│  │ :5432         │  │ :6333         │  │ :11434        │  │ :6379         │       │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Langfuse (Observability)                              │  │
│  │                    Trace LLM calls • :3333                                   │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow

```
User → UIt → Gateway → OAuth Provider
                ↓
         Callback with tokens
                ↓
         Store in PostgreSQL
                ↓
         Redirect to UIt (success)
```

**Process:**
1. User clicks "Connect GitHub" in UIt
2. Gateway redirects to provider's OAuth consent screen
3. Provider redirects back to `/api/{provider}/auth/callback`
4. Gateway stores access/refresh tokens in PostgreSQL
5. User can now access their data

### 2. Data Synchronization Flow

```
Scheduler (cron) → Queue Job → Worker → Connector
                                            ↓
                                    Fetch from API
                                            ↓
                                    Store in PostgreSQL
                                            ↓
                                    Trigger ETL
                                            ↓
                              Generate Embeddings (Ollama)
                                            ↓
                                    Store in Qdrant
```

**Process:**
1. Scheduler triggers ETL job based on priority and cron schedule
2. Worker picks up job from Redis queue
3. Connector fetches data from external API
4. Raw data stored in PostgreSQL for persistence
5. RetoVe ETL extracts data, generates embeddings via Ollama
6. Embeddings stored in Qdrant collections

### 3. Query Flow (RAG)

```
User Query → Gateway → AI SDK
                          ↓
                  Query Analysis
                          ↓
                  Collection Routing
                          ↓
                  Vector Search (Qdrant)
                          ↓
                  Context Assembly
                          ↓
                  LLM Generation (Ollama)
                          ↓
                  Stream Response → UIt
```

**Process:**
1. User sends query through UIt chat interface
2. AI SDK analyzes query intent
3. Router determines relevant collections (Spotify, GitHub, etc.)
4. Vector search retrieves semantically similar documents
5. Context assembled with relevant data chunks
6. Ollama generates response with RAG context
7. Response streamed back to user

## Package Structure

### Core (`@ait/core`)

Shared utilities used across all packages:

```
packages/core/
├── src/
│   ├── errors/          # Custom error classes (AItError, RateLimitError)
│   ├── http/            # HTTP client with retry logic
│   ├── logging/         # Structured logger
│   ├── types/           # Shared type definitions
│   └── validation/      # Zod schemas and validators
```

### Connectors (`@ait/connectors`)

Platform integration framework:

```
packages/connectors/
├── src/
│   ├── domain/
│   │   ├── entities/    # Domain models (Repository, Track, Issue)
│   │   └── mappers/     # API response → Domain entity mappers
│   ├── infrastructure/
│   │   └── vendors/     # API clients per platform
│   ├── services/
│   │   ├── vendors/     # High-level service per platform
│   │   └── shared/      # Sync state, pagination
│   └── shared/
│       └── auth/        # OAuth handling
```

**Adding a New Connector:**
1. Create API client in `infrastructure/vendors/`
2. Define entities in `domain/entities/`
3. Implement mapper in `domain/mappers/`
4. Create service in `services/vendors/`
5. Register in `ConnectorServiceFactory`

### AI SDK (`@ait/ai-sdk`)

AI capabilities and RAG pipeline:

```
packages/infrastructure/ai-sdk/
├── src/
│   ├── client/          # Main AIt client initialization
│   ├── config/          # Models, presets, collections
│   ├── pipelines/       # RAG, generation, complete pipelines
│   ├── services/
│   │   ├── embeddings/  # Embedding generation
│   │   ├── generation/  # Query rewriting, suggestions
│   │   ├── insights/    # Analytics, anomaly detection
│   │   ├── rag/         # Pipeline stages
│   │   ├── ranking/     # Reranking services
│   │   ├── routing/     # Collection routing
│   │   └── text-generation/  # LLM interaction
│   ├── stages/          # Pipeline stage implementations
│   ├── telemetry/       # Langfuse integration
│   ├── tools/           # Function calling tools
│   └── types/           # Type definitions
```

### Gateway (`@ait/gateway`)

API server and routing:

```
packages/gateway/
├── src/
│   ├── config/          # Server configuration
│   ├── routes/          # API route handlers
│   │   ├── auth/        # OAuth routes per provider
│   │   ├── chat/        # Chat/RAG endpoints
│   │   └── data/        # Data retrieval endpoints
│   └── services/        # Business logic
```

### Scheduler (`@ait/scheduler`)

Job scheduling with BullMQ:

```
packages/infrastructure/scheduler/
├── src/
│   ├── scheduler.service.ts      # Core scheduler
│   ├── scheduler.entrypoint.ts   # Job definitions
│   └── task-manager/             # ETL task registry
```

### RetoVe (`@ait/retove`)

ETL pipeline for embeddings:

```
packages/transformers/retove/
├── src/
│   ├── services/
│   │   ├── etl/         # ETL orchestration
│   │   ├── embeddings/  # Embedding generation
│   │   └── vendors/     # Per-vendor ETL logic
│   └── scripts/         # Python embedding alternatives
```

## Infrastructure

### PostgreSQL Schema

Key tables:

| Table | Purpose |
|-------|---------|
| `oauth_tokens` | Stores encrypted OAuth credentials |
| `sync_state` | Tracks last sync time per entity type |
| `spotify_tracks` | Raw Spotify track data |
| `github_repositories` | Raw GitHub repo data |
| `linear_issues` | Raw Linear issue data |
| ... | Similar tables per entity type |

### Qdrant Collections

Collections are organized by vendor:

| Collection | Vector Size | Content |
|------------|-------------|---------|
| `ait_spotify_collection` | 1024 | Tracks, artists, playlists, albums |
| `ait_github_collection` | 1024 | Repositories, PRs, commits |
| `ait_linear_collection` | 1024 | Issues, projects |
| `ait_x_collection` | 1024 | Tweets, threads |
| `ait_notion_collection` | 1024 | Pages, databases |
| `ait_slack_collection` | 1024 | Messages, channels |
| `ait_google_collection` | 1024 | Calendar events, YouTube |

### Redis Queues

BullMQ queue structure:

```
bull:etl-scheduler:waiting    # Jobs waiting to be processed
bull:etl-scheduler:active     # Currently processing jobs
bull:etl-scheduler:completed  # Successfully completed jobs
bull:etl-scheduler:failed     # Failed jobs (with retry info)
bull:etl-scheduler:delayed    # Scheduled future jobs
```

## Security Model

### OAuth Token Storage

- Tokens encrypted at rest in PostgreSQL
- Refresh tokens handled automatically
- Per-user token isolation

### Local Processing

- All LLM processing happens locally via Ollama
- No data sent to external AI services
- Vector embeddings stored locally in Qdrant

### API Security

- HTTPS required for OAuth callbacks
- Session-based authentication for UIt
- CORS configured for frontend origin

## Extensibility

### Adding a New Connector

1. **Define Types** (`packages/core/src/types/integrations/`)
   ```typescript
   export interface NewServiceTrack {
     id: string;
     name: string;
     // ...
   }
   ```

2. **Create Connector** (`packages/connectors/src/`)
   - API client in `infrastructure/vendors/`
   - Entity in `domain/entities/`
   - Mapper in `domain/mappers/`
   - Service in `services/vendors/`

3. **Add Gateway Routes** (`packages/gateway/src/routes/`)
   - OAuth flow routes
   - Data retrieval routes

4. **Create ETL** (`packages/transformers/retove/src/`)
   - ETL task for the new vendor
   - Register in scheduler

5. **Update AI SDK** (`packages/infrastructure/ai-sdk/`)
   - Add collection config
   - Create tools if needed

### Adding a New Pipeline Stage

```typescript
import type { IPipelineStage, PipelineContext, StageResult } from '@ait/ai-sdk';

export class CustomStage implements IPipelineStage {
  name = 'custom-stage';
  
  async execute(context: PipelineContext): Promise<StageResult> {
    // Your logic here
    return {
      success: true,
      data: { /* results */ },
      metadata: { timing: Date.now() - start }
    };
  }
}
```

### Environment Configuration

All services are configured via environment variables. See `.env.example` for the complete list.

## Performance Considerations

### Embedding Generation

- Batch processing with configurable concurrency
- LRU cache for repeated embeddings
- Intelligent chunking (4096 tokens, 200 overlap)

### Vector Search

- Approximate nearest neighbor (ANN) via Qdrant
- Collection-specific routing reduces search space
- Hybrid search with sparse vectors available

### Job Processing

- Priority-based queue processing
- Configurable concurrency per worker
- Exponential backoff for retries

## Monitoring

### Langfuse Integration

Enable observability for LLM operations:

```typescript
initAItClient({
  // ...
  telemetry: {
    enabled: true,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseURL: 'http://localhost:3333',
  },
});
```

Tracks:
- Generation latency and token usage
- RAG retrieval quality
- Tool call success rates
- Error rates and patterns

