# Connectors

## Overview

The Connectors module provides a reusable framework for integrating platforms into AIt with modular design, shared utilities, and OAuth 2.0 support. Supports GitHub, Linear, Spotify, X (Twitter), Notion, Slack, and Google.

## Canonical Entity Types

AIt normalizes every ingested object with a stable `__type` string (see `@ait/core` `EntityType`). These values are used consistently across:
- Gateway data APIs (filtering/routing)
- ETL + Qdrant collection routing
- UI “entity pages” (e.g. X tweets, Linear issues)

**Current `EntityType` values:**
- **Spotify**: `spotify_track`, `spotify_artist`, `spotify_playlist`, `spotify_album`, `spotify_recently_played`
- **GitHub**: `github_repository`, `github_pull_request`, `github_commit`, `github_file`
- **Linear**: `linear_issue`
- **X**: `x_tweet`
- **Notion**: `notion_page`
- **Slack**: `slack_message`
- **Google**: `google_calendar_event`, `google_calendar_calendar`, `google_youtube_subscription`, `google_contact`, `google_photo`

## Quick Start

### Generate OpenAPI Types

First, generate TypeScript interfaces from OpenAPI specifications:

```bash
pnpm generate:openapi
```

> **Note**: Generated types are not committed to avoid repository bloat.

### Install Dependencies

```bash
corepack enable
pnpm install
```

## Configuration

### Environment Variables

The Connectors package requires `AIT_ENCRYPTION_KEY` to be set in the environment for decrypting platform configurations stored in the database.

```bash
# PostgreSQL Configuration
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

# Encryption
AIT_ENCRYPTION_KEY=your_64_character_hex_encryption_key_here
```

## Usage

### Basic Connector Usage

Connectors are now database-driven. Use the `connectorServiceFactory` to retrieve a service based on its configuration ID from the database.

```typescript
import { connectorServiceFactory } from '@ait/connectors';

// Retrieve a connector service by its database configuration ID
const githubService = await connectorServiceFactory.getServiceByConfig(
  'config_id_from_db',
  'user_id'
);

// Fetch data (authentication and token management is handled internally)
const repositories = await githubService.getRepositories();
```

### Using with Gateway

Connectors are typically used through the [Gateway](../gateway/README.md), which handles OAuth flows and token management:

1. User visits `/api/{provider}/auth` endpoint
2. Gateway redirects to OAuth provider
3. Provider redirects back to `/api/{provider}/auth/callback`
4. Gateway stores tokens in database
5. Connector services use stored tokens for API calls

### Creating Custom Connectors

```typescript
import { ConnectorBaseAbstract } from '@ait/connectors';

export class CustomConnector extends ConnectorBaseAbstract {
  // Implement required methods
  async authenticate(token: string): Promise<void> {
    // Your authentication logic
  }

  async fetchData(): Promise<YourDataType[]> {
    // Your data fetching logic
  }
}
```

## Architecture

- **Modular Design**: Each connector is self-contained
- **Shared Utilities**: Common OAuth and HTTP client utilities
- **Type Safety**: OpenAPI-generated TypeScript interfaces
- **Token Management**: Automatic token refresh and persistence

## Development

### Testing

```bash
pnpm test
```

### Code Generation

```bash
# Generate OpenAPI types
pnpm generate:openapi
```

## Integration

Connectors are integrated into AIt through:
- **[Gateway](../gateway/README.md)** - API endpoints and OAuth handling
- **[Scheduler](../../infrastructure/scheduler/README.md)** - Automated data synchronization
- **[ETL Pipeline](../../transformers/retove/README.md)** - Data transformation and embedding
- **[Storage](../../infrastructure/storage/README.md)** - Object storage for binary assets (e.g. Google Photos)

## License

[MIT](../../LICENSE)
