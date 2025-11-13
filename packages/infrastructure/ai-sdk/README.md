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
  rag: { 
    collection: 'ait_embeddings_collection',
    strategy: 'multi-query',
    maxDocs: 100
  },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 100,
      queriesCount: 12,
      concurrency: 4
    }
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
  rag: { collection: 'ait_embeddings_collection' }
});

// Get the service (no need to instantiate TextGenerationService manually!)
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

**🎉 What's New:**
- **Simplified Setup**: Configure everything (client + services) in a single `initAItClient()` call
- **No Manual Instantiation**: Use `getTextGenerationService()` instead of `new TextGenerationService()`
- **No Config Duplication**: Pass `textGeneration` config once, not twice
- **Better DX**: One initialization, zero boilerplate

### Conversation History

```typescript
import { initAItClient, getTextGenerationService, type ChatMessage } from '@ait/ai-sdk';

// Initialize once
initAItClient({
  rag: { collection: 'ait_embeddings_collection' }
});

const service = getTextGenerationService();

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
import { initAItClient, getTextGenerationService, createAllConnectorTools } from '@ait/ai-sdk';

// Initialize
initAItClient({
  rag: { collection: 'ait_embeddings_collection' }
});

const service = getTextGenerationService();
const tools = createAllConnectorTools(/* your connector service */);

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
| `gpt-oss:20b-cloud` | 4096 | 128,000 | OpenAI's open-weight 20B model (cloud) |
| `qwen3:latest` | 4096 | 32,768 | Qwen3 general-purpose |
| `deepseek-r1:latest` | 4096 | 32,768 | DeepSeek R1 reasoning |
| `kimi-k2-thinking:cloud` | 4096 | 128,000 | Kimi K2 Thinking for advanced reasoning |
| `granite4:latest` | 4096 | 32,768 | Granite 4 general-purpose |

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

The system will generate 12-16 diverse queries covering all connectors (Spotify, GitHub, X, Linear, Notion) to retrieve comprehensive context.

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

## Observability with Langfuse

AIt integrates with [Langfuse](https://langfuse.com) to provide comprehensive observability for LLM operations, including text generation, embeddings, RAG queries, and tool calls.

### Setup

1. **Start Langfuse services:**

```bash
docker-compose up ait_langfuse ait_langfuse_db
```

Access Langfuse UI at `http://localhost:3000` and create a project to get your API keys.

2. **Configure environment variables:**

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_BASEURL=http://localhost:3000
LANGFUSE_ENABLED=true
```

3. **Initialize with telemetry:**

```typescript
import { initAItClient } from '@ait/ai-sdk';

initAItClient({
  generation: { model: 'gemma3:latest' },
  embeddings: { model: 'mxbai-embed-large:latest' },
  rag: { collection: 'ait_embeddings_collection' },
  telemetry: {
    enabled: true,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseURL: process.env.LANGFUSE_BASEURL,
  },
});
```

### Usage

Telemetry is opt-in per request using the `enableTelemetry` flag:

```typescript
import { getTextGenerationService } from '@ait/ai-sdk';

const service = getTextGenerationService();

const stream = service.generateStream({
  prompt: 'Tell me about my recent projects',
  enableRAG: true,
  enableTelemetry: true,
  userId: 'user-123',
  sessionId: 'session-456',
  tags: ['development', 'projects'],
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Tracked Operations

Langfuse automatically tracks:

- **Text Generation**: Prompts, responses, model parameters, streaming chunks
- **Embeddings**: Text chunking, vector generation, model details
- **RAG Operations**: Context preparation, document retrieval, similarity searches
- **Conversation Management**: Message processing, context window management
- **Performance Metrics**: Latency, token counts, chunk processing time

### Trace Metadata

Customize traces with metadata:

```typescript
const stream = service.generateStream({
  prompt: 'Analyze my coding patterns',
  enableTelemetry: true,
  userId: 'user-123',
  sessionId: 'session-456',
  tags: ['analysis', 'coding'],
});
```

All metadata is automatically captured and displayed in the Langfuse dashboard for analysis and debugging.

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests (requires Ollama + Qdrant)
pnpm test:e2e

# Build
pnpm build
```

## Developer Experience Improvements

### Before (Manual Setup)

```typescript
import { initAItClient, TextGenerationService } from '@ait/ai-sdk';

// Step 1: Initialize client
initAItClient({
  generation: { model: 'gemma3:latest' },
  embeddings: { model: 'mxbai-embed-large:latest' },
  rag: { collection: 'ait_embeddings_collection' }
});

// Step 2: Manually create service with duplicated config
const service = new TextGenerationService({
  collectionName: 'ait_embeddings_collection', // Already set in rag.collection above!
  multipleQueryPlannerConfig: {
    maxDocs: 100,
    queriesCount: 12,
    concurrency: 4
  }
});
```

### After (Simplified Setup)

```typescript
import { initAItClient, getTextGenerationService } from '@ait/ai-sdk';

// One-time initialization with everything configured
initAItClient({
  generation: { model: 'gemma3:latest' },
  embeddings: { model: 'mxbai-embed-large:latest' },
  rag: { collection: 'ait_embeddings_collection' },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 100,
      queriesCount: 12,
      concurrency: 4
    }
  }
});

// Get the service (automatically configured!)
const service = getTextGenerationService();
```

**Benefits:**
- ✅ No configuration duplication
- ✅ Single initialization point
- ✅ Consistent API with other getters like `getAItClient()`
- ✅ Better TypeScript autocomplete
- ✅ Easier testing and mocking

## Migration from LangChain

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

Key differences:
- New client API: `createAItClient()` vs `getLangChainClient()`
- Streaming returns async iterators directly
- Tools use AI SDK's native tool system
- Better TypeScript types throughout

## Multi-Collection RAG Architecture

AIt uses a sophisticated multi-collection RAG system that organizes embeddings by domain/vendor for better semantic clarity and routing.

### Overview

Instead of storing all embeddings in a single collection, data is separated into domain-specific collections:

- **`ait_spotify_collection`**: Music tracks, artists, playlists, albums
- **`ait_github_collection`**: Repositories, pull requests
- **`ait_linear_collection`**: Issues and tasks
- **`ait_x_collection`**: Tweets and social media
- **`ait_general_collection`**: General-purpose data

### Query Processing Pipeline

```
User Query
    ↓
Query Planner (generates variants)
    ↓
Collection Router (LLM-powered)
    ↓
Parallel Multi-Collection Search
    ↓
Weighted Rank Fusion
    ↓
Collection-Specific Reranking
    ↓
Response
```

### Usage Example

```typescript
import {
  CollectionRouterService,
  MultiCollectionProvider,
  WeightedRankFusionService,
  getGenerativeModel,
} from '@ait/ai-sdk';

// 1. Route query to relevant collections
const router = new CollectionRouterService(getGenerativeModel());
const routing = await router.route("Show me my favorite tracks from last week");
// Returns: [{ vendor: "spotify", weight: 0.9 }]

// 2. Search across selected collections in parallel
const provider = new MultiCollectionProvider();
const results = await provider.searchAcrossCollections(
  query,
  routing.collections,
  50
);

// 3. Fuse results with weighted scoring
const fusion = new WeightedRankFusionService();
const fusedResults = fusion.fuseResults(
  results.results.map(r => ({
    vendor: r.vendor,
    documents: r.documents.map(d => [d, d.metadata.score || 0]),
    collectionWeight: routing.collections.find(c => c.vendor === r.vendor)?.weight || 1.0,
  })),
  20
);
```

### Adding New Collections

1. Define collection config in `src/config/collections.config.ts`:

```typescript
const NEW_COLLECTION: CollectionConfig = {
  vendor: "new_vendor",
  name: "ait_new_vendor_collection",
  description: "Your collection description",
  entityTypes: ["entity_type_1"],
  defaultWeight: 1.0,
  enabled: true,
};
```

2. Create ETL to populate collection:

```typescript
import { RetoveBaseETLAbstract, getCollectionNameByVendor } from '@ait/ai-sdk';

export class RetoveNewVendorETL extends RetoveBaseETLAbstract {
  constructor(pgClient, qdrantClient) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("new_vendor"));
  }
  // Implement extract, getTextForEmbedding, getPayload
}
```

3. Run ETL to populate:

```typescript
const etl = new RetoveNewVendorETL(pgClient, qdrantClient);
await etl.run(10_000);
```

### Pipeline Architecture

Build composable RAG pipelines using the pipeline framework:

```typescript
import { PipelineBuilder, PipelineStageAbstract } from '@ait/ai-sdk';

// Define custom stages
class QueryPlannerStage extends PipelineStageAbstract<string, QueryPlan> {
  name = "query-planner";
  
  protected async process(query: string, context: PipelineContext) {
    return await this.queryPlanner.planQuery(query);
  }
}

class CollectionRouterStage extends PipelineStageAbstract<QueryPlan, Route> {
  name = "collection-router";
  
  protected async process(plan: QueryPlan, context: PipelineContext) {
    return await this.router.route(plan.primaryQuery);
  }
}

// Build and execute pipeline
const pipeline = PipelineBuilder.create()
  .addStage(new QueryPlannerStage(queryPlanner))
  .addStage(new CollectionRouterStage(router))
  .addStage(new SearchStage(provider))
  .addStage(new FusionStage(fusion))
  .build();

const result = await pipeline.execute("user query", { traceContext });
```

**Benefits:**
- **Domain Specialization**: Each collection focuses on specific data types
- **Reduced Noise**: No semantic pollution between unrelated entities
- **Intelligent Routing**: LLM selects relevant collections dynamically
- **Weighted Fusion**: Results combined with configurable importance weights
- **Parallel Search**: Multiple collections queried simultaneously
- **Composable Pipelines**: Build custom RAG workflows with reusable stages

## License

[MIT](../../LICENSE)

