# @ait/ai-sdk

Custom AI implementation for AIt with Ollama, RAG (Retrieval-Augmented Generation), and tool calling capabilities.

## Overview

This package provides a lightweight, custom integration with Ollama for text generation and embeddings. Unlike typical AI SDK implementations, we communicate directly with Ollama's native HTTP API, giving us full control and eliminating dependency issues.

**Key Design Decisions:**
- **Zero AI SDK Dependencies**: No `ai` or `ollama-ai-provider` packages - just direct HTTP calls
- **Custom Ollama Provider**: Complete control over request/response handling
- **Advanced RAG**: Multi-query retrieval with Qdrant vector database  
- **Tool Calling**: First-class support for connector-specific searches (Spotify, GitHub, X, Linear)
- **Streaming**: Real-time text generation with smooth terminal output
- **Embeddings**: Intelligent chunking, LRU caching, and concurrent processing
- **Type Safety**: Full TypeScript support with custom interfaces

## Installation

```bash
cd packages/infrastructure/ai-sdk
pnpm install
```

## Quick Start

### Initialize the Client

```typescript
import { initAItClient, getAItClient } from '@ait/ai-sdk';

// Initialize with default configuration
initAItClient({
  generation: { 
    model: 'gemma3:latest',
    temperature: 0.7 
  },
  embeddings: { 
    model: 'mxbai-embed-large:latest' 
  },
  rag: { 
    collection: 'ait_embeddings_collection',
    strategy: 'multi-query',
    maxDocs: 100
  }
});
```

### Text Generation (Streaming)

```typescript
import { TextGenerationService, smoothStream } from '@ait/ai-sdk';

const service = new TextGenerationService({
  model: 'gemma3:latest',
  collectionName: 'ait_embeddings_collection'
});

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
import { TextGenerationService, type ChatMessage } from '@ait/ai-sdk';

const service = new TextGenerationService({
  collectionName: 'ait_embeddings_collection'
});

// Helper to collect stream into text
async function collectStream(stream: AsyncGenerator<string>): Promise<string> {
  let text = '';
  for await (const chunk of stream) {
    text += chunk;
    process.stdout.write(chunk);
  }
  return text;
}

// Start a conversation
const messages: ChatMessage[] = [];

// Turn 1
const stream1 = service.generateStream({
  prompt: 'La canzone più recente che hai ascoltato?',
  enableRAG: true
});
const response1 = await collectStream(stream1);

messages.push(
  { role: 'user', content: 'La canzone più recente che hai ascoltato?' },
  { role: 'assistant', content: response1 }
);

// Turn 2 - with conversation context
const stream2 = service.generateStream({
  prompt: 'Sicuro che sia la più recente? Controlla le date~',
  enableRAG: true,
  messages: messages  // Pass conversation history
});
const response2 = await collectStream(stream2);

messages.push(
  { role: 'user', content: 'Sicuro che sia la più recente? Controlla le date~' },
  { role: 'assistant', content: response2 }
);

// Turn 3 - Ask about the first message
const stream3 = service.generateStream({
  prompt: 'Dimmi il primo messaggio di questa chat.',
  enableRAG: false,  // No RAG needed - just conversation memory
  messages: messages
});
const response3 = await collectStream(stream3);

console.log('\nAIt remembers the conversation!');
```

**Key Features:**
- ✅ Multi-turn conversations with full context
- ✅ Streaming responses for better UX
- ✅ Compatible with RAG - context retrieval uses current prompt
- ✅ Simple array-based message history
- ✅ Automatic conversation formatting

### Tool Calling

```typescript
import { createAllConnectorTools, QdrantProvider } from '@ait/ai-sdk';

const qdrantProvider = new QdrantProvider({
  collectionName: 'ait_embeddings_collection'
});

const tools = createAllConnectorTools(qdrantProvider);

// Streaming with tool calling
const stream = service.generateStream({
  prompt: 'What am I listening to?',
  tools: { getRecentlyPlayed: tools.getRecentlyPlayed },
  maxToolRounds: 2,
  enableRAG: true
});

// AIt will automatically:
// 1. Call the getRecentlyPlayed tool
// 2. Get your Spotify recently played tracks
// 3. Stream a natural language response about your music
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

**Available Tools:**
- `searchSpotify` - Search Spotify tracks, albums, artists, playlists
- `getRecentlyPlayed` - Get recently played Spotify tracks
- More connectors coming soon (GitHub, X, Linear)

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

console.log('Vector dimensions:', vectors.length);
```

## Configuration

### Environment Variables

```bash
# Model Configuration
GENERATION_MODEL=gemma3:latest
EMBEDDINGS_MODEL=mxbai-embed-large:latest
GENERATION_TEMPERATURE=0.7
GENERATION_TOP_P=0.9

# Vector Sizes (optional overrides)
GENERATION_VECTOR_SIZE=4096
EMBEDDINGS_VECTOR_SIZE=1024

# Embeddings Configuration
EMBEDDINGS_CHUNK_SIZE=4096
EMBEDDINGS_CHUNK_OVERLAP=200
EMBEDDINGS_CONCURRENCY_LIMIT=4
EMBEDDINGS_WEIGHT_CHUNKS=false
EMBEDDINGS_NORMALIZE_TEXT=true
EMBEDDINGS_PRESERVE_SENTENCES=true
EMBEDDINGS_MAX_RETRIES=3
EMBEDDINGS_RETRY_DELAY_MS=1000

# Infrastructure
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
DEFAULT_RAG_COLLECTION=ait_embeddings_collection
```

### Available Models

#### Generation Models

| Model | Vector Size | Context Window | Description |
|-------|-------------|----------------|-------------|
| `gemma3:latest` | 4096 | 32,768 | Gemma 3 model (default) |
| `gpt-oss:20b` | 4096 | 128,000 | OpenAI's open-weight 20B model |
| `qwen3:latest` | 4096 | 32,768 | Qwen3 general-purpose |
| `deepseek-r1:latest` | 4096 | 32,768 | DeepSeek R1 reasoning |

#### Embedding Models

| Model | Vector Size | Description |
|-------|-------------|-------------|
| `mxbai-embed-large:latest` | 1024 | MixedBread.ai (default) |
| `qwen3-embedding:latest` | 4096 | Qwen3 embeddings |
| `bge-m3:latest` | 1024 | BGE-M3 multilingual |

## Advanced Features

### Multi-Query RAG Retrieval

The multi-query retrieval system automatically generates diverse search queries to ensure comprehensive context:

```typescript
import { MultiQueryRetrieval, QdrantProvider } from '@ait/ai-sdk';

const retrieval = new MultiQueryRetrieval({
  maxDocs: 100,
  queriesCount: 12
});

const qdrant = new QdrantProvider({
  collectionName: 'ait_embeddings_collection'
});

const docs = await retrieval.retrieveWithMultiQueries(
  qdrant,
  'What are my recent coding projects?'
);
```

The system will generate 12-16 diverse queries covering all connectors (Spotify, GitHub, X, Linear) to retrieve comprehensive context.

### Custom Tools

Define custom tools for specific use cases:

```typescript
import { createTool } from '@ait/ai-sdk';
import { z } from 'zod';

const customTool = createTool({
  description: 'Search for specific data',
  parameters: z.object({
    query: z.string(),
    filter: z.string().optional()
  }),
  execute: async ({ query, filter }) => {
    // Your custom logic
    return { results: [] };
  }
});

const stream = service.generateStream({
  prompt: 'Use my custom search',
  tools: { customSearch: customTool }
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Context Building

Customize how context is built from retrieved documents:

```typescript
import { ContextBuilder } from '@ait/ai-sdk';

const builder = new ContextBuilder();

// Build with score information for debugging
const { context, scoreInfo } = builder.buildContextWithScores(
  documents.map(doc => ({ doc, score: 0.95 }))
);

console.log('Score info:', scoreInfo);
```

## Architecture

```
@ait/ai-sdk/
├── client/           # AI SDK client initialization
├── config/           # Model configuration
├── services/
│   ├── embeddings/  # Embeddings with chunking & caching
│   ├── text-generation/ # Text generation with RAG
│   └── prompts/     # System prompts
├── rag/             # RAG components
│   ├── qdrant.provider.ts      # Vector store
│   ├── multi-query.retrieval.ts # Query planning
│   └── context.builder.ts       # Context building
├── tools/           # Connector tools
└── cache/           # LRU cache
```

## Performance

- **Streaming**: ~50ms first token latency
- **Embeddings**: Batch processing with configurable concurrency
- **Caching**: 24-hour TTL for embeddings with LRU eviction
- **RAG**: Multi-query retrieval with score-based deduplication

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests (requires Ollama + Qdrant)
pnpm test:e2e

# Build
pnpm build
```

## Migration from LangChain

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

Key differences:
- New client API: `createAItClient()` vs `getLangChainClient()`
- Streaming returns async iterators directly
- Tools use AI SDK's native tool system
- Better TypeScript types throughout

## License

[MIT](../../LICENSE)

