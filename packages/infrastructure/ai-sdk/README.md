# @ait/ai-sdk

Custom AI implementation for AIt with Ollama, RAG (Retrieval-Augmented Generation), and tool calling capabilities.

## Overview

Lightweight, custom integration with Ollama for text generation and embeddings. Communicates directly with Ollama's native HTTP API for full control and zero dependency issues.

**Key Features:**
- **Zero AI SDK Dependencies**: Direct HTTP calls to Ollama
- **Advanced RAG**: Multi-query retrieval with Qdrant vector database
- **Tool Calling**: Connector-specific searches (Spotify, GitHub, X, Linear)
- **Streaming**: Real-time text generation
- **Embeddings**: Intelligent chunking, LRU caching, concurrent processing
- **Type Safety**: Full TypeScript support

## Quick Start

### Initialize the Client

```typescript
import { initAItClient, getTextGenerationService } from '@ait/ai-sdk';

// Initialize everything in one call
initAItClient({
  generation: { 
    model: 'gemma3:latest',
    temperature: 0.7 
  },
  embeddings: { 
    model: 'mxbai-embed-large:latest' 
  },
  textGeneration: {
    retrievalConfig: { limit: 33, scoreThreshold: 0.4 },
    contextConfig: { maxContextChars: 128000 },
  }
});

// Get the text generation service (automatically configured)
const service = getTextGenerationService();
```

### Text Generation (Streaming)

```typescript
import { initAItClient, getTextGenerationService, smoothStream } from '@ait/ai-sdk';

// Initialize once
initAItClient({
  generation: { model: 'gemma3:latest' },
  embeddings: { model: 'mxbai-embed-large:latest' },
});

const service = getTextGenerationService();

// Streaming generation with RAG
const stream = service.generateStream({
  prompt: 'Tell me about my Spotify playlists',
  enableRAG: true
});

// Option 1: Simple iteration
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// Option 2: Smooth streaming with visual feedback
const text = await smoothStream(stream, {
  delay: 50,
  prefix: 'AIt:',
  cursor: '▌'
});
```

### Conversation History

```typescript
import { initAItClient, getTextGenerationService, type ChatMessage } from '@ait/ai-sdk';

initAItClient();
const service = getTextGenerationService();

const messages: ChatMessage[] = [];

// Turn 1
const stream1 = service.generateStream({
  prompt: 'What did I listen to recently?',
  enableRAG: true
});
const response1 = await collectStream(stream1);

messages.push(
  { role: 'user', content: 'What did I listen to recently?' },
  { role: 'assistant', content: response1 }
);

// Turn 2 - with conversation context
const stream2 = service.generateStream({
  prompt: 'Tell me more about the first track',
  enableRAG: true,
  messages: messages  // Pass conversation history
});
```

### Tool Calling

```typescript
import { initAItClient, getTextGenerationService, createAllConnectorTools } from '@ait/ai-sdk';

initAItClient();
const service = getTextGenerationService();
const tools = createAllConnectorTools(/* your connector service */);

// Streaming with tool calling
const stream = service.generateStream({
  prompt: 'What am I listening to?',
  tools: { getRecentlyPlayed: tools.getRecentlyPlayed },
  maxToolRounds: 2,
  enableRAG: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

**Available Tools:**
- `searchSpotify` - Search Spotify tracks, albums, artists, playlists
- `getRecentlyPlayed` - Get recently played Spotify tracks
- `searchGoogle` - Search Google Calendar events, YouTube subscriptions, and Contacts
- `searchGitHub` - Search GitHub repositories, pull requests, and commits
- `searchX` - Search X (Twitter) tweets and users
- `searchLinear` - Search Linear issues and projects

### Composable RAG Functions

Use `retrieve` and `rerank` for flexible RAG workflows:

```typescript
import { retrieve, rerank, stream } from '@ait/ai-sdk';

// Retrieve relevant documents from collections
const docs = await retrieve({
  query: 'my recent GitHub commits',
  collections: ['ait_github_collection'],
  limit: 20,
});

// Rerank for relevance
const ranked = await rerank({
  query: 'my recent GitHub commits',
  documents: docs.documents,
  topK: 5,
});

// Stream response with context
const { textStream } = await stream({
  prompt: 'Summarize my recent commits',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### Provider Registration

Register external providers for caching and analytics (typically done in gateway):

```typescript
import { registerCacheProvider, registerAnalyticsProvider } from '@ait/ai-sdk';

// Register a cache provider (e.g., Redis)
registerCacheProvider(myRedisProvider);

// Register an analytics provider
registerAnalyticsProvider(myAnalyticsAdapter);
```

### Embeddings Generation

```typescript
import { EmbeddingsService } from '@ait/ai-sdk';

const embeddingsService = new EmbeddingsService(
  'mxbai-embed-large:latest',
  1024, // vector size
  { 
    concurrencyLimit: 4,
    weightChunks: false
  }
);

const vectors = await embeddingsService.generateEmbeddings(
  'Your text here',
  { correlationId: 'request-123' }
);
```

## Configuration

### Environment Variables

```bash
# Model Configuration
GENERATION_MODEL=gemma3:latest
EMBEDDINGS_MODEL=mxbai-embed-large:latest
GENERATION_TEMPERATURE=0.7
GENERATION_TOP_P=0.9

# Embeddings Configuration
EMBEDDINGS_CHUNK_SIZE=4096
EMBEDDINGS_CHUNK_OVERLAP=200
EMBEDDINGS_CONCURRENCY_LIMIT=4

# Infrastructure
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
DEFAULT_RAG_COLLECTION=ait_embeddings_collection
```

### Available Models

#### Generation Models

| Model | Context Window | Description |
|-------|----------------|-------------|
| `gemma3:latest` | 32,768 | Gemma 3 model (default) |
| `gpt-oss:20b` | 128,000 | OpenAI's open-weight 20B model |
| `qwen3:latest` | 32,768 | Qwen3 general-purpose |
| `deepseek-r1:latest` | 32,768 | DeepSeek R1 reasoning |
| `granite4:latest` | 32,768 | Granite 4 general-purpose |

#### Embedding Models

| Model | Vector Size | Description |
|-------|-------------|-------------|
| `mxbai-embed-large:latest` | 1024 | MixedBread.ai (default) |
| `qwen3-embedding:latest` | 4096 | Qwen3 embeddings |
| `bge-m3:latest` | 1024 | BGE-M3 multilingual |

## Observability with Langfuse

AIt integrates with [Langfuse](https://langfuse.com) for comprehensive observability of LLM operations.

### Setup

1. Start Langfuse services:
```bash
docker-compose up ait_langfuse ait_langfuse_db
```

2. Configure environment variables:
```bash
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_BASEURL=https://localhost:3000
LANGFUSE_ENABLED=true
```

3. Initialize with telemetry:
```typescript
initAItClient({
  generation: { model: 'gemma3:latest' },
  embeddings: { model: 'mxbai-embed-large:latest' },
  telemetry: {
    enabled: true,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseURL: process.env.LANGFUSE_BASEURL,
  },
});
```

### Usage

Enable telemetry per request:
```typescript
const stream = service.generateStream({
  prompt: 'Tell me about my recent projects',
  enableRAG: true,
  enableTelemetry: true,
  userId: 'user-123',
  sessionId: 'session-456',
  tags: ['development', 'projects'],
});
```

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests (requires Ollama + Qdrant)
pnpm test:e2e

# Build
pnpm build
```

## Advanced Features

For advanced features including:
- Multi-collection RAG architecture
- Composable RAG functions (`retrieve`, `rerank`)
- Custom tools and MCP integration
- Provider registration (cache, analytics)
- Performance optimization

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for detailed documentation.

## License

[MIT](../../LICENSE)
