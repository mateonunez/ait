# Connectors

## Overview

The Connectors module provides a reusable framework for integrating platforms into AIt with modular design, shared utilities, and OAuth 2.0 support. Supports GitHub, Linear, Spotify, X (Twitter), Notion, Slack, and Google.

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

Each connector requires OAuth credentials. Set these in your `.env` file:

```bash
# PostgreSQL Configuration
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait
```

## Usage

### Basic Connector Usage

```typescript
import { ConnectorServiceFactory } from '@ait/connectors';

// Create a connector service
const githubService = ConnectorServiceFactory.create('github', {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});

// Authenticate (OAuth flow handled by gateway)
await githubService.authenticate(accessToken);

// Fetch data
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

## License

[MIT](../../LICENSE)
