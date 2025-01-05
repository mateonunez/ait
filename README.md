# AIt

Hey there! I'm _AIt_ (pronounced "eight" /eɪt/). 👋

## Overview

> Wait for it.

### Key Features

- 🔌 **Smart Connectors**:
  - GitHub integration for repository analysis
  - Spotify integration for music insights
  - OAuth 2.0 secure authentication

- 🔄 **ETL Pipeline**:
  - Extract data from multiple sources
  - Transform using LangChain and embeddings
  - Load into vector databases for semantic search

- 💾 **Storage Solutions**:
  - PostgreSQL for structured data
  - Qdrant for vector similarity search
  - Ollama for local LLM processing

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
cd packages/internals/postgres

# Ensure you have set the required environment variables

pnpm db:generate  # Generates the database schema
pnpm db:migrate   # Migrates the database schema
```

### 🏃 Running

1. Development mode:

```bash
cd packages/connectors # <- The webserver will move out of this folder soon

# Ensure you have set the required environment variables

pnpm dev
```

2. Run ETL process:

```bash
cd packages/transformers/etl # <- Will be scheduled by jobs soon

# Ensure you have set the required environment variables

pnpm etl
```

### Authentication

AIt securely connects to GitHub and Spotify using OAuth 2.0. Here's how to get started:

1. Start the connector service:

```bash
cd packages/connectors

pnpm dev
```

You can follow the steps below to set up your own OAuth applications:

2. Visit the authentication URLs:
  - GitHub: `https://github.com/login/oauth/authorize?client_id=Ov23liPVDFK2UZgKcv7E&redirect_uri=http://localhost:3000/api/github/auth/callback&scope=repo`
  - Spotify: `https://accounts.spotify.com/authorize?client_id=d9f5dd3420704900bfb74b933ec8cbde&response_type=code&redirect_uri=http://localhost:3000/api/spotify/auth/callback&scope=playlist-read-private,playlist-read-collaborative,user-read-playback-state,user-read-currently-playing,user-read-recently-played,user-read-playback-position,user-top-read`
3. Allow the requested permissions when prompted.

Once authenticated, AIt can fetch and process your data while maintaining secure access tokens.

### Collecting for Knowledge

After authentication, AIt will:
1. 📝 Log the process in your terminal
2. 📡 Fetch repositories data from your GitHub account, or Spotify Account
3. 💾 Store the collected data in the PostgreSQL database
4. 🔍 Make it available for vector search through Qdrant

This data is then used for:
- Semantic search across your repositories
- Repository analysis and insights
- Integration with AI-powered features

### Development

#### Testing

```bash
pnpm test       # Run all tests
pnpm test:watch # Watch mode
```

#### Linting

```bash
pnpm lint      # Run linting
pnpm lint:fix  # Fix linting issues
```

### 📝 License

[MIT](LICENSE)
