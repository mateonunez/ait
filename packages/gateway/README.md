# Gateway & Connectors Documentation

## Overview

The **Gateway** module integrates with the **Connectors** package to provide a unified API for external platforms (via OAuth 2.0). Although the connectors are implemented as a separate module, they are used by the gateway at runtime. This means that any secrets or configuration required by the connectors must be available as environment variables when running the gateway.

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

Both the gateway and connectors rely on a common set of environment variables. Copy the `.env.example` file to `.env` and configure at least the following variables:

```dotenv
APP_PORT=3000

POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# ... any other GitHub scopes

SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
# ... any other Spotify scopes

X_CLIENT_ID=...
X_CLIENT_SECRET=...
# ... any other X scopes
```

### Running Services

**Generate OpenAPI Types**:

This command generates the OpenAPI types for the connectors (the generated types are not committed to the repository to avoid bloating it).

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

**X**:

```
http://localhost:3000/api/x/auth
```

### License

[MIT](../../LICENSE)
