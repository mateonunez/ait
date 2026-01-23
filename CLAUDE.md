# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

### Common Commands

```bash
# Setup
corepack enable
pnpm install
pnpm start:services              # Start Docker services (PostgreSQL, Qdrant, Ollama, Redis, Langfuse)
pnpm migrate                     # Run database migrations
pnpm run --filter @ait/postgres db:seed  # Seed database with initial provider config

# Development
pnpm dev                         # Start all dev servers
pnpm build                       # Build all packages
pnpm test                        # Run tests (starts test Docker services automatically)
pnpm test:watch                  # Watch mode for tests

# Code Quality
pnpm lint                        # Check with Biome
pnpm lint:fix                    # Auto-fix issues
pnpm typecheck                   # Run TypeScript type checking

# Database
pnpm migrate                     # Run migrations (from root or postgres package)
pnpm run --filter @ait/postgres db:studio  # Open database UI
cd packages/infrastructure/postgres && pnpm db:generate  # Regenerate DB types

# Code Generation
pnpm generate:openapi            # Generate OpenAPI TypeScript types (connectors)

# Service Management
pnpm start:services              # Start all Docker services
pnpm stop:services               # Stop services
pnpm clean:services              # Stop and remove volumes
pnpm clean:all                   # Full cleanup (node_modules, dist, services)

# Testing Specific Packages
pnpm --filter @ait/core test
pnpm --filter @ait/connectors test
pnpm --filter @ait/ai-sdk test
```

### Running a Single Test

```bash
# Node.js native test runner - use --test-name-pattern
node --test --test-name-pattern="test name pattern" path/to/test-file.test.ts
```

## Architecture Overview

AIt is a monorepo with a layered architecture that follows this data flow:

```
OAuth → Connector → PostgreSQL → Scheduler/ETL → Embeddings → Qdrant → RAG → AI Response
```

### Key Layers

1. **Gateway** (`packages/gateway`)
   - Unified API gateway for all connectors
   - Handles OAuth 2.0 flows and token management
   - Provides REST endpoints: `/api/{provider}/auth`, `/api/{provider}/data`
   - Includes analytics, cache, and insights services
   - Uses Express with session-based authentication
   - OAuth credentials stored encrypted in database (not env vars)

2. **Connectors** (`packages/connectors`)
   - Modular OAuth 2.0 integrations: GitHub, Linear, Spotify, X, Notion, Slack, Google (Calendar, YouTube, Photos, Contacts)
   - Database-driven configuration via `connectorServiceFactory`
   - Shared base classes in `shared/` directory
   - Store implementations in `infrastructure/vendors/`
   - Domain logic in `domain/`
   - Each connector normalizes data to canonical `EntityType` values (e.g., `spotify_track`, `github_repository`)

3. **AI SDK** (`packages/infrastructure/ai-sdk`)
   - Custom Ollama integration (zero external AI SDK dependencies)
   - Direct HTTP API calls for full control
   - RAG with Qdrant vector search (multi-query retrieval)
   - Tool calling for connector searches
   - Streaming text generation
   - Embeddings with chunking and LRU caching
   - Provider registration for cache/analytics (used by Gateway)

4. **Scheduler** (`packages/infrastructure/scheduler`)
   - BullMQ + Redis-based job queue
   - Priority-based ETL scheduling (1=high, 3=low)
   - Configurable cron intervals (dev vs production)
   - Concurrent worker processing (default: 2)
   - Uses TypeScript decorators (requires reflect-metadata, .swcrc config)

5. **RetoVe (ETL)** (`packages/transformers/retove`)
   - Relational to Vector ETL pipeline
   - Extracts from PostgreSQL → generates embeddings → loads to Qdrant
   - Multiple embedding methods: Ollama SDK, LangChain, Python scripts
   - Automated via Scheduler or manual via `pnpm etl`

6. **Core** (`packages/core`)
   - Shared utilities, types, error handling
   - Result type for type-safe error handling (`Result<T, E>`, `ok()`, `err()`)
   - HTTP client (`requestJson`, `requestStream`)
   - Logger with correlation IDs
   - Zod-based validation
   - OpenAPI-generated integration types
   - Custom error classes: `AItError`, `RateLimitError`

7. **Infrastructure**
   - **PostgreSQL** (`packages/infrastructure/postgres`): Drizzle ORM, migrations in `src/migrations/`
   - **Qdrant** (`packages/infrastructure/qdrant`): Vector database client
   - **Storage** (`packages/infrastructure/storage`): S3/MinIO for binary assets (Google Photos)
   - **Store** (`packages/infrastructure/store`): Application data (conversations, feedback, goals)
   - **Redis** (`packages/infrastructure/redis`): Job queue and caching

8. **UI** (`packages/apps/`)
   - **UIt**: Main React web interface (Vite + React)
   - **Chat**: Landing page (React + Vite + Tailwind)

## Key Architectural Patterns

### Entity Types
All data is normalized with stable `__type` strings defined in `@ait/core` `EntityType`. This drives:
- Gateway API filtering/routing
- Qdrant collection routing in ETL
- UI entity pages

Current types: `spotify_track`, `spotify_artist`, `github_repository`, `github_pull_request`, `linear_issue`, `x_tweet`, `notion_page`, `slack_message`, `google_calendar_event`, `google_photo`, etc.

### OAuth & Token Management
- OAuth credentials stored **in database** (encrypted with `AIT_ENCRYPTION_KEY`)
- NOT in environment variables (legacy approach)
- Gateway handles full OAuth flow and callback handling
- Connectors use factory pattern: `connectorServiceFactory.getServiceByConfig(configId, userId)`
- Tokens auto-refresh and persist to database

### RAG Pipeline
1. User query → AI SDK text generation service
2. If `enableRAG: true`:
   - Multi-query retrieval from Qdrant
   - Rerank by relevance
   - Inject context into prompt
3. Optional tool calling (connector searches)
4. Stream response chunks

### Result Type Pattern
Use `Result<T, E>` instead of try-catch:
```typescript
const result = await someOperation();
if (result.ok) {
  // result.value
} else {
  // result.error
}
```

### Logger Pattern
```typescript
import { getLogger } from '@ait/core';
const logger = getLogger();
logger.info('message', { meta });
const childLogger = logger.child({ correlationId });
```

## Code Standards

### File Organization
```
packages/{package}/
├── src/
│   ├── index.ts              # Public exports
│   ├── services/             # Business logic
│   ├── types/                # Type definitions
│   └── utils/                # Utilities
├── test/
│   └── **/*.test.ts          # Tests mirror src/ structure
├── package.json
├── tsconfig.json
└── README.md
```

### Naming Conventions
- Classes: PascalCase (`ConnectorService`)
- Interfaces: PascalCase with `I` prefix (`IConnectorService`)
- Methods/Variables: camelCase (`fetchUserData`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- Files: kebab-case (`connector.service.ts`)
- Type files: `.types.ts` suffix
- Scoped files: `.{interface,type,spec}.ts` suffixes

### Testing
- Framework: Node.js native test runner (`node:test`)
- Structure: `describe` / `it` blocks
- Location: `test/` directory mirrors `src/`
- Run: `pnpm test` (auto-starts test Docker services)
- Watch: `pnpm test:watch`

### TypeScript
- Strong typing required (avoid `any`)
- Check `@ait/core` for existing types before creating new ones
- Interface + implementation pattern for services
- Decorators enabled for Scheduler (reflect-metadata)

### Formatting
- Tool: Biome
- Indent: 2 spaces
- Line width: 120 chars
- Semicolons: required
- Quotes: double

## Environment Configuration

Key environment variables (see `.env.example`):
```bash
# Core
AIT_ENCRYPTION_KEY=your_64_character_hex_key  # Required for OAuth credential encryption

# Infrastructure
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait
REDIS_URL=redis://:myredissecret@localhost:6379
QDRANT_URL=http://localhost:6333
OLLAMA_BASE_URL=http://localhost:11434

# Storage (for Google Photos)
MINIO_REGION=us-east-1
MINIO_ENDPOINT=http://localhost:9090
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=miniosecret

# Models
GENERATION_MODEL=gemma3:latest
EMBEDDINGS_MODEL=mxbai-embed-large:latest

# Gateway
APP_PORT=3000
USE_HTTPS=false  # Set true for OAuth flows requiring HTTPS
SESSION_SECRET=your_session_secret

# Observability (optional)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=https://localhost:3000
LANGFUSE_ENABLED=true
```

## Critical Implementation Details

### OpenAPI Type Generation
- Generated types are NOT committed (avoid repo bloat)
- Must run `pnpm generate:openapi` after fresh clone
- Located in connectors package
- Re-run after API spec changes

### Database Migrations
- Located in `packages/infrastructure/postgres/src/migrations/`
- Use Drizzle ORM
- Run from root: `pnpm migrate`
- Generate types: `cd packages/infrastructure/postgres && pnpm db:generate`
- Seed: `pnpm run --filter @ait/postgres db:seed`

### Scheduler Decorators
- Uses TypeScript decorators for dependency injection
- Requires `reflect-metadata` imported at entrypoint
- `.swcrc` must have `legacyDecorator` and `decoratorMetadata` enabled
- `tsconfig.json` needs `experimentalDecorators` and `emitDecoratorMetadata`

### HTTPS for OAuth
- Some OAuth providers require HTTPS callbacks
- Generate certs: `cd packages/gateway && npm run cert:generate`
- Trust cert (macOS): `npm run cert:trust`
- Set `USE_HTTPS=true` in `.env`

### Ollama Models
Required models must be pulled into Docker container:
```bash
docker exec -it ait_ollama ollama pull gemma3:latest
docker exec -it ait_ollama ollama pull mxbai-embed-large:latest
```

## Workspace Structure

Monorepo using pnpm workspaces:
- `packages/core` - Foundation layer
- `packages/connectors` - Platform integrations
- `packages/gateway` - API gateway
- `packages/infrastructure/*` - Data layer (postgres, qdrant, ai-sdk, scheduler, storage, store, redis)
- `packages/transformers/*` - ETL (retove)
- `packages/apps/*` - UI (uit, chat)

Dependencies:
- Use `workspace:*` protocol for internal packages
- All packages depend on `@ait/core` for shared utilities

## Troubleshooting

### Services won't start
```bash
docker info  # Check Docker is running
lsof -i :5432  # Check for port conflicts
pnpm clean:all && pnpm install && pnpm start:services
```

### Database connection errors
```bash
docker exec ait_postgres pg_isready -U root -d ait
echo $POSTGRES_URL  # Verify matches docker-compose
pnpm migrate
```

### OAuth callback errors
- Ensure HTTPS configured if required by provider
- Check `AIT_ENCRYPTION_KEY` is set (64 hex chars)
- Verify redirect URIs match OAuth app settings

### Tests failing
- Ensure test services running: `pnpm start:services:test`
- Check test database migrated: `pnpm run --filter @ait/postgres db:migrate:test`
- Cleanup: `pnpm stop:services:test && pnpm start:services:test`

## Commit Conventions

Follow conventional commits:
```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(connectors): add Notion integration`
- `fix(ai-sdk): resolve streaming timeout issue`
- `docs(readme): add troubleshooting section`
