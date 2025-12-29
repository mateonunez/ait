# Gateway

## Overview

The Gateway module provides a unified API for external platforms via OAuth 2.0. It integrates with the [Connectors](../connectors/README.md) package to handle authentication and data access for GitHub, Linear, Spotify, X, Notion, Slack, and Google (Calendar, YouTube, Contacts, Photos).

## Quick Start

### Prerequisites

- Services running: PostgreSQL, Redis
- Environment variables configured (see Configuration)

### Development Mode

```bash
# Generate OpenAPI types (required first time)
pnpm generate:openapi

# Start development server
pnpm dev
```

The gateway runs on `https://localhost:3000` by default.

### HTTPS Setup

For OAuth flows requiring HTTPS, see [HTTPS_SETUP.md](./HTTPS_SETUP.md) for certificate generation and configuration.

## Configuration

### Environment Variables

Both the gateway and connectors rely on common environment variables. Create a `.env` file:

```bash
# Server Configuration
APP_PORT=3000
USE_HTTPS=false  # Set to true for HTTPS (see HTTPS_SETUP.md)

# Database
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait

# Redis (used by caching/queues depending on enabled services)
REDIS_URL=redis://:myredissecret@localhost:6379

# OAuth Credentials
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

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

# S3 / MinIO (required for Google Photos binary storage)
MINIO_REGION=us-east-1
MINIO_ENDPOINT=http://localhost:9090
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=miniosecret
```

See the [Connectors README](../connectors/README.md) for detailed connector configuration.

## Authentication

AIt securely connects to platforms using OAuth 2.0. Visit these URLs to authenticate:

- **GitHub**: `https://localhost:3000/api/github/auth`
- **Linear**: `https://localhost:3000/api/linear/auth`
- **Spotify**: `https://localhost:3000/api/spotify/auth`
- **X**: `https://localhost:3000/api/x/auth`
- **Google**: `https://localhost:3000/api/google/auth`
- **Notion**: `https://localhost:3000/api/notion/auth`
- **Slack**: `https://localhost:3000/api/slack/auth`

Once authenticated, OAuth tokens are securely stored in the database for future requests.

## API Endpoints

### Authentication Endpoints

- `GET /api/{provider}/auth` - Initiate OAuth flow
- `GET /api/{provider}/auth/callback` - OAuth callback handler
- `GET /api/{provider}/auth/status` - Check authentication status

### Data Endpoints

- `GET /api/{provider}/data` - Fetch provider-specific data
- `POST /api/{provider}/sync` - Trigger manual data synchronization

See individual connector implementations in the [Connectors package](../connectors/README.md) for provider-specific endpoints.

## Development

### Generate OpenAPI Types

Generate TypeScript interfaces from OpenAPI specifications:

```bash
pnpm generate:openapi
```

> **Note**: Generated types are not committed to avoid repository bloat.

### Testing

```bash
pnpm test
```

## Integration with Connectors

The Gateway uses connectors at runtime. Any secrets or configuration required by connectors must be available as environment variables when running the gateway.

For connector implementation details, see the [Connectors README](../connectors/README.md).

## Internal Services

The Gateway includes application-level services that are initialized at server startup:

### Analytics Services (`services/analytics/`)

- **Performance Metrics**: Tracks latency, throughput, and success rates
- **Cost Tracking**: Monitors token usage and cost per model
- **Cache Analytics**: Measures cache hit rates and efficiency
- **Failure Analysis**: Classifies and tracks error patterns

### Cache Services (`services/cache/`)

- **Semantic Cache**: Caches responses based on query similarity
- **Query Normalizer**: Normalizes queries for better cache hits
- **Redis Provider**: Redis-backed cache implementation

### Insights Services (`services/insights/`)

- **Activity Aggregator**: Aggregates user activity across connectors
- **Anomaly Detector**: Detects unusual patterns in data
- **Correlation Engine**: Finds relationships between data sources

These services integrate with the AI SDK via provider registration:

```typescript
import { initializeCacheProvider, initializeAnalyticsProvider } from './services';

// Called at server startup
initializeCacheProvider(redisUrl);
initializeAnalyticsProvider();
```

## License

[MIT](../../LICENSE)
