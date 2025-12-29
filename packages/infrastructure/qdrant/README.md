# Qdrant

## Overview

Qdrant is the vector database used by AIt for semantic search and similarity operations. It stores embeddings generated from your connected sources (GitHub, Spotify, Linear, X, Notion, Slack, Google) for RAG (Retrieval-Augmented Generation) queries.

## Quick Start

Qdrant is automatically started with other services:

```bash
pnpm start:services  # From root directory
```

The service runs on `http://localhost:6333` by default.

## Configuration

Set the following environment variable to customize the connection:

```bash
QDRANT_URL=http://localhost:6333  # Default
```

## Usage

Qdrant is primarily used through the [AI SDK](../ai-sdk/README.md) for RAG operations. Collections are automatically created during ETL processes.

### Collections

Collections are created per vendor/domain:
- `ait_spotify_collection` - Music tracks, artists, playlists
- `ait_github_collection` - Repositories, pull requests
- `ait_linear_collection` - Issues and tasks
- `ait_x_collection` - Tweets and social media
- `ait_google_collection` - Calendar events, YouTube, Contacts
- `ait_notion_collection` - Pages and databases
- `ait_slack_collection` - Messages and channels

See the [AI SDK documentation](../ai-sdk/README.md) for details on multi-collection RAG.

## Development

Access Qdrant dashboard at `http://localhost:6333/dashboard` for collection management and query testing.

## License

[MIT](../../LICENSE)
