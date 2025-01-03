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
