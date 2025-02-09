# AIt

Hey there! I'm _AIt_ (acts like "alt" /ɔːlt/, but also pronounced as "eight" /eɪt/). It depends. 🤷‍♂️

## Overview

> Thinking... 🤔

### Key Features

- **Connectors**:
  - GitHub integration for repository analysis
  - Spotify integration for music insights
  - OAuth 2.0 secure authentication

- **ETL Pipeline**:
  - Extract data from multiple sources
  - Transform using LangChain and embeddings
  - Load into vector databases for semantic search

- **Storage Solutions**:
  - PostgreSQL for structured data
  - Qdrant for vector similarity search
  - Ollama for local LLM processing

- **Scheduler**:
  - Schedule and manage ETL tasks
  - Uses BullMQ for job queue management
  - Supports cron expressions for periodic tasks
  
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
````

### 🔧 Configuration

1. Set up environment variables:

> You can follow the `.env.example` file to create your own `.env` file, it accepts also `.env.test` for testing purposes.

```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
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
- Generate embeddings for test prompts
- Perform similarity searches
- Generate responses using Ollama (deepseek-r1:8b)

### 🌐 Connectors

AIt provides smart connectors for GitHub and Spotify. Here's how to get started:

#### 1. Development mode:

```bash
cd packages/connectors # <- The webserver will move out of this folder soon

# Ensure you have set the required environment variables

pnpm dev
```

#### 2. Authentication

AIt securely connects to GitHub and Spotify using OAuth 2.0. Here's how to get started:

1. Visit the authentication URLs:
  - GitHub: [Authenticate with GitHub](https://github.com/login/oauth/authorize?client_id=Iv23liZi6U4SNA5ppud2&redirect_uri=http://localhost:3000/api/github/auth/callback&scope=repo)
  - Spotify: [Authenticate with Spotify](https://accounts.spotify.com/authorize?client_id=d9f5dd3420704900bfb74b933ec8cbde&response_type=code&redirect_uri=http://localhost:3000/api/spotify/auth/callback&scope=playlist-read-private,playlist-read-collaborative,user-read-playback-state,user-read-currently-playing,user-read-recently-played,user-read-playback-position,user-top-read)

2. Allow the requested permissions when prompted.

Once authenticated, AIt can fetch and process your data while maintaining secure access tokens, the OAuth information is stored in the database to be used for future requests.

### 🧠 Ollama

Ollama is used for local LLM processing. Here is how to set it up:

1. Start the Ollama service:

```bash
docker-compose up -d ait_ollama
```

2. Access the Ollama container:

```bash
docker exec -it ait_ollama sh
```

3. Install the model:

```bash
ollama pull deepseek-r1:8b
```

### 🛠️ Development

#### Testing

To run tests within an isolated test environment using [./docker-compose.test.yml](./docker-compose.test.yml), follow these steps:

1. Start the required services:

```bash
pnpm start:services:test
```

3. Run the tests:

ℹ️ The npm `pretest` script will automatically run the migrations and seed the test database before running the tests. _This may change in the future._

```bash
pnpm test
```

4. Stop the services:

```bash
pnpm stop:services:test
```

> Note: Ensure that the `ait_testing` database is correctly initialized and that all migration scripts have been successfully applied before running tests, the `.env.test` is used for testing purposes.

#### Linting

```bash
pnpm lint      # Run linting
pnpm lint:fix  # Fix linting issues
```

### 📝 License

[MIT](LICENSE)
