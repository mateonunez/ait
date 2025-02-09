# Connectors README

## Overview

The **Connectors** module provides a reusable framework for integrating platforms into AIt with modular design, shared utilities, and OAuth 2.0 support.

## Setup

### Install Dependencies

```bash
corepack enable
pnpm install
```

### Run Tests

```bash
pnpm test
```

## Getting Started

### Environment Variables

Copy the `.env.example` file to `.env` and configure the following environment variables:

```dotenv
APP_PORT=3000

POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# ... any other GitHub scopes

SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
# ... any other Spotify scopes
```

### Running Services

**Generate OpenAPI Types**:

This will generate the OpenAPI types for the connectors.

```bash
pnpm generate:openapi
```

> [!NOTE]
> The generated types are not committed to the repository to avoid bloating the codebase.

**Development**:

Run the application in development mode:

```bash
pnpm dev
```

**Database**:

Generate database migrations:

```bash
pnpm db:generate
```

Apply database migrations:

```bash
pnpm db:migrate
```

Open database studio:

```bash
pnpm db:studio
```

### Connectors

#### Manual

**GitHub**:

```
https://github.com/login/oauth/authorize?client_id=Ov23liPVDFK2UZgKcv7E&redirect_uri=http://localhost:3000/api/github/auth/callback&scope=repo
```

**Spotify**:

```
https://accounts.spotify.com/authorize?client_id=d9f5dd3420704900bfb74b933ec8cbde&response_type=code&redirect_uri=http://localhost:3000/api/spotify/auth/callback&scope=playlist-read-private,playlist-read-collaborative,user-read-playback-state,user-read-currently-playing,user-read-recently-played,user-read-playback-position,user-top-read
```

### License

[MIT](../../LICENSE)
