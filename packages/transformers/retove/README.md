# RetoVe (Relational to Vector ETL)

## Overview

RetoVe is the ETL pipeline that extracts data from PostgreSQL, transforms it into embeddings, and loads them into Qdrant for semantic search. Supports multiple embedding generation methods.

## Quick Start

### Prerequisites

Ensure the following services are running:
- PostgreSQL (with migrated schema)
- Qdrant
- Ollama (for embeddings)

### Run ETL

```bash
cd packages/transformers/retove
pnpm etl
```

This will process all available data and create embeddings in Qdrant collections.

## Configuration

Set environment variables for embedding generation:

```bash
# Embedding model (default: mxbai-embed-large)
EMBEDDINGS_MODEL=mxbai-embed-large:latest

# Ollama endpoint
OLLAMA_BASE_URL=http://localhost:11434

# Qdrant endpoint
QDRANT_URL=http://localhost:6333

# Database connection
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait
```

## Embedding Generation Methods

### With Ollama SDK

Use the `generateEmbeddings` method from `etl.embeddings.service`:

```typescript
import { generateEmbeddings } from './src/services/embeddings.service';

const embeddings = await generateEmbeddings(text);
```

### With LangChain

Use the `generateLangchainEmbeddings` method:

```typescript
import { generateLangchainEmbeddings } from './src/services/embeddings.service';

const embeddings = await generateLangchainEmbeddings(text);
```

### With Python

For Python-based embedding generation:

```bash
cd src/scripts/generate_embeddings
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python generate_embeddings.py
```

## ETL Workflow

1. **Extract**: Query PostgreSQL for unprocessed records
2. **Transform**: Generate embeddings using configured method
3. **Load**: Store embeddings in Qdrant collections

Collections are organized by vendor (Spotify, GitHub, Linear, X) for better semantic organization.

## Automated ETL

For automated ETL scheduling, use the [Scheduler](../../infrastructure/scheduler/README.md) which runs ETL jobs on a configurable schedule.

## Development

See the [AI SDK documentation](../../infrastructure/ai-sdk/README.md) for details on how embeddings are used in RAG operations.

## License

[MIT](../../LICENSE)
