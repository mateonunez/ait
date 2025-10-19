# AIt

Hey there! I'm _AIt_ (acts like "alt" /ɔːlt/, but also pronounced as "eight" /eɪt/). It depends. 🤷‍♂️

## Overview

> Thinking... 🤔

### Key Features

- **Connectors**:
  - GitHub integration for repository analysis and OAuth 2.0 authentication
  - Linear integration for issue tracking and project management
  - Spotify integration for music insights and playlist analysis
  - X integration for tweets analysis
  - Modular connector architecture with shared utilities
  - Type-safe OpenAPI generated interfaces
  - Automatic token refresh and persistence

- **ETL Pipeline**:
  - Extract data from multiple sources using typed connectors
  - Transform using LangChain and multiple embedding options
  - Load into vector databases for semantic search
  - Support for both Python and Node.js embedding generation
  - Flexible pipeline configuration

- **Storage Solutions**:
  - PostgreSQL for structured data and OAuth tokens
  - Qdrant for vector similarity search
  - Ollama for local LLM processing (gpt-oss:20b for generation, mxbai-embed-large for embeddings)
  - Redis for job queue and caching

- **Scheduler**:
  - Schedule and manage ETL tasks with BullMQ
  - Automated token refresh and data synchronization
  - Supports cron expressions for periodic tasks
  - Configurable job priorities and retries
  
## 🚀 Getting Started

### Prerequisites

1. Install Node.js dependencies:

```bash
corepack enable
pnpm install
```

2. Start required services:
> It requires Docker and Docker Compose to be installed.

```bash
pnpm start:services   # Starts PostgreSQL, Qdrant, Ollama, etc
```

### 🔧 Configuration

1. Set up environment variables:

> You can follow the `.env.example` file to create your own `.env` file. The project also supports `.env.test` for testing purposes.

```bash
# Database Configuration
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
GITHUB_ENDPOINT=https://github.com/login/oauth/access_token
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/auth/callback
GITHUB_AUTH_URL=https://github.com/login/oauth/authorize

# Linear OAuth
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_secret
LINEAR_ENDPOINT=https://api.linear.app/oauth/token
LINEAR_REDIRECT_URI=http://localhost:3000/api/linear/auth/callback
LINEAR_AUTH_URL=https://linear.app/oauth/authorize
LINEAR_API_ENDPOINT=https://api.linear.app/graphql

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
SPOTIFY_ENDPOINT=https://accounts.spotify.com/api/token
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/auth/callback
SPOTIFY_AUTH_URL=https://accounts.spotify.com/authorize
SPOTIFY_API_ENDPOINT=https://api.spotify.com/v1

# X OAuth
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_secret
X_ENDPOINT=https://api.x.com/2/oauth2/token
X_REDIRECT_URI=http://localhost:3000/api/x/auth/callback
X_AUTH_URL=https://twitter.com/i/oauth2/authorize
X_API_ENDPOINT=https://api.x.com/2
```

2. Initialize the database:

```bash
# Ensure you have set the required environment variables

pnpm migrate
```

### 🎬 Action

AIt provides flexibility in running the ETL process either automatically through the Scheduler or manually as needed.

#### 1. Automated ETL via Scheduler

The Scheduler manages also the ETL process. It uses BullMQ for job queue management and supports cron expressions for periodic tasks.

```bash
docker compose build ait_scheduler && docker compose up -d ait_scheduler
```

Ensure the Scheduler is properly configured by setting the necessary environment variables in `.env`, and the following services are running:
- ait_postgres
- ait_qdrant
- ait_redis

#### 2. Manual ETL

If you prefer to run the ETL process manually, you can do so by following these steps:

```bash
cd packages/transformers/retove

# Ensure you have set the required environment variables

pnpm etl
```

#### 3. Text Generation

After the ETL process, you can generate text using the `TextGeneration` service. Here's how to get started:

```bash
cd packages/infrastructure/langchain # <- The service will move out of this folder soon
npx tsx src/services/text-generation/text-generation.service.e2e.ts
```

The E2E tests will:

- Connect to your Qdrant collections (_github_repositories_collection_ and _spotify_tracks_collection_)
- Generate embeddings for test prompts using mxbai-embed-large
- Perform similarity searches
- Generate responses using Ollama (gpt-oss:20b)

### 🌐 Gateway & Connectors

The project provides smart connectors for GitHub, Spotify, X, and more through a unified gateway. Here's how to get started:

#### 1. Generate OpenAPI Types

First, generate the TypeScript interfaces from OpenAPI specifications:

```bash
cd packages/connectors
pnpm generate:openapi
```

> Note: Generated types are not committed to avoid repository bloat.

#### 2. Development Mode

```bash
cd packages/gateway
pnpm dev
```

#### 3. Authentication

AIt securely connects to platforms using OAuth 2.0. Visit these URLs to authenticate:

1. GitHub:
```
http://localhost:3000/api/github/auth
```

2. Linear:
```
http://localhost:3000/api/linear/auth
```

3. Spotify:
```
http://localhost:3000/api/spotify/auth
```

4. X:
```
http://localhost:3000/api/x/auth
```

Once authenticated, AIt securely stores and manages OAuth tokens in the database for future requests.

### 🧠 LLM Processing

AIt uses Ollama for local LLM processing. Here's how to set it up:

1. Start the Ollama service:

```bash
docker compose up -d ait_ollama
```

2. Install the models:

```bash
# Install generation model (GPT-OSS 20B)
docker exec -it ait_ollama sh -c "ollama pull gpt-oss:20b"

# Install embedding model (MixedBread.ai large)
docker exec -it ait_ollama sh -c "ollama pull mxbai-embed-large"
```

The models are used for:
- **gpt-oss:20b**: Text generation, reasoning, and agentic tasks
- **mxbai-embed-large**: Generating embeddings for semantic search via LangChain
- Similarity search operations in Qdrant vector store

> **Note**: You can easily switch models by setting environment variables or updating the centralized configuration. See `packages/infrastructure/langchain/MODELS.md` for more details.

### 🛠️ Development

#### Testing

Run tests in an isolated environment using Docker Compose:

```bash
# Run tests (services, migrations and seeding happen automatically)
pnpm test
```

> Note: Ensure the `ait_testing` database is properly initialized. The project uses `.env.test` for test configuration.

#### Code Generation

```bash
# Generate OpenAPI types
pnpm generate:openapi

# Generate database types
cd packages/infrastructure/postgres
pnpm db:generate
```

#### Database Management

```bash
# Run migrations
pnpm db:migrate

# Access database UI
pnpm db:studio
```

#### Linting

```bash
pnpm lint      # Run linting
pnpm lint:fix  # Fix linting issues
```

### 📝 License

[MIT](LICENSE)
