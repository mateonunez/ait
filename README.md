# AIt

Hey there! I'm _AIt_ (acts like "alt" /ɔːlt/, but also pronounced as "eight" /eɪt/). It depends. 🤷‍♂️

AIt is a comprehensive platform for extracting, transforming, and loading data from multiple sources (GitHub, Linear, Spotify, X) into vector databases for AI-powered semantic search and text generation.

## Quick Start

```bash
# 1. Install dependencies
corepack enable
pnpm install

# 2. Start services (PostgreSQL, Qdrant, Ollama, Redis)
pnpm start:services

# 3. Configure environment variables (see Configuration section)
# Create .env file with required variables (check the example files in the packages)

# 4. Initialize database
pnpm migrate

# 5. Start the services
pnpm dev
```

## Architecture

AIt follows a modular monorepo architecture:

- **Connectors** (`packages/connectors`) - OAuth 2.0 integrations with GitHub, Linear, Spotify, X
- **Gateway** (`packages/gateway`) - Unified API gateway for all connectors
- **ETL Pipeline** (`packages/transformers/retove`) - Extract, transform, and load data into vector stores
- **Scheduler** (`packages/infrastructure/scheduler`) - Automated ETL job scheduling with BullMQ
- **AI SDK** (`packages/infrastructure/ai-sdk`) - RAG, text generation, and embeddings with Ollama
- **Storage** - PostgreSQL (structured data), Qdrant (vectors), Redis (job queue)
- **UI** (`packages/uit`) - Web interface for interacting with AIt

## Key Features

- **Multi-source Connectors**: GitHub, Linear, Spotify, X, Notion, Slack and more with OAuth 2.0
- **Vector Search**: Qdrant-based semantic search with embeddings
- **Local LLM**: Ollama integration for text generation and embeddings
- **Automated ETL**: Scheduled data synchronization with configurable priorities
- **RAG Pipeline**: Multi-collection retrieval-augmented generation
- **Type-safe**: OpenAPI-generated TypeScript interfaces

## Configuration

Create a `.env` file in the root directory with the following essential variables:

```bash
# Database
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

# OAuth (required for connectors)
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

# Infrastructure URLs (defaults usually work)
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
```

See individual package READMEs for detailed configuration options.

## Development

### Testing

```bash
pnpm test  # Runs tests with isolated Docker services
```

### Code Generation

```bash
pnpm generate:openapi  # Generate OpenAPI types
cd packages/infrastructure/postgres && pnpm db:generate  # Generate DB types
```

### Database Management

```bash
pnpm migrate      # Run migrations
pnpm db:studio    # Open database UI (from postgres package)
```

### Linting

```bash
pnpm lint      # Check code
pnpm lint:fix  # Fix issues
```

## Package Documentation

- **[Gateway](packages/gateway/README.md)** - API gateway and OAuth authentication
- **[Connectors](packages/connectors/README.md)** - Platform integrations framework
- **[Scheduler](packages/infrastructure/scheduler/README.md)** - ETL job scheduling
- **[AI SDK](packages/infrastructure/ai-sdk/README.md)** - RAG and text generation
- **[ETL Pipeline](packages/transformers/retove/README.md)** - Data transformation
- **[PostgreSQL](packages/infrastructure/postgres/README.md)** - Database client
- **[Qdrant](packages/infrastructure/qdrant/README.md)** - Vector database
- **[Ollama](packages/infrastructure/ollama/README.md)** - LLM service setup
- **[Redis](packages/infrastructure/redis/README.md)** - Job queue and caching
- **[UI](packages/uit/README.md)** - Web interface

## License

[MIT](LICENSE)
