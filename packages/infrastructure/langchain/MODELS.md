# Model Configuration Guide

This document explains how to configure and switch between different AI models in AIt.

## Overview

AIt uses two types of models:
1. **Generation Models**: For text generation, reasoning, and agentic tasks
2. **Embedding Models**: For creating vector embeddings for semantic search

The centralized model configuration system (`src/models.config.ts`) provides:
- Type-safe model specifications
- Easy model switching via environment variables or code
- Automatic vector size configuration
- Support for custom models

## Default Models

| Type | Model | Vector Size | Description |
|------|-------|-------------|-------------|
| Generation | `gpt-oss:20b` | 4096 | OpenAI's open-weight 20B model for powerful reasoning and agentic tasks |
| Embedding | `mxbai-embed-large` | 1024 | MixedBread.ai large embedding model - recommended for semantic search |

## Available Model Presets

### Generation Models

| Model | Vector Size | Context Window | Description |
|-------|-------------|----------------|-------------|
| `gpt-oss:20b` | 4096 | 128,000 | OpenAI's open-weight 20B model (default) |
| `gpt-oss:120b` | 4096 | 128,000 | OpenAI's open-weight 120B model for advanced reasoning |
| `qwen3:latest` | 4096 | 32,768 | Qwen3 general-purpose text generation |
| `deepseek-r1:latest` | 4096 | 32,768 | DeepSeek R1 reasoning model |

### Embedding Models

| Model | Vector Size | Description |
|-------|-------------|-------------|
| `mxbai-embed-large` | 1024 | MixedBread.ai large model (default) - best for retrieval quality |
| `qwen3-embedding:latest` | 4096 | Qwen3 embeddings for general-purpose use |
| `bge-m3` | 1024 | BGE-M3 multilingual embedding model |
| `snowflake-arctic-embed` | 1024 | Snowflake Arctic embedding model for retrieval |

## How to Switch Models

### Method 1: Environment Variables (Recommended)

Set environment variables in your `.env` file:

```bash
# Change generation model
GENERATION_MODEL=gpt-oss:120b

# Change embedding model
EMBEDDINGS_MODEL=qwen3-embedding:latest

# Optional: Override vector sizes
GENERATION_VECTOR_SIZE=4096
EMBEDDINGS_VECTOR_SIZE=4096
```

Restart your application for changes to take effect.

### Method 2: Update Default in Code

Edit `packages/infrastructure/langchain/src/models.config.ts`:

```typescript
// Change the default model names
const DEFAULT_GENERATION_MODEL_NAME = "your-preferred-model";
const DEFAULT_EMBEDDING_MODEL_NAME = "your-preferred-embedding-model";
```

### Method 3: Runtime Override

For testing or special use cases, you can override models at runtime:

```typescript
import { initLangChainClient } from './langchain.client';

// Override configuration
initLangChainClient({
  model: 'gpt-oss:120b',
  expectedVectorSize: 4096
});
```

## Installing Models

Before using a model, you must pull it from Ollama:

```bash
# Pull generation models
docker exec -it ait_ollama sh -c "ollama pull gpt-oss:20b"
docker exec -it ait_ollama sh -c "ollama pull gpt-oss:120b"
docker exec -it ait_ollama sh -c "ollama pull qwen3:latest"
docker exec -it ait_ollama sh -c "ollama pull deepseek-r1:latest"

# Pull embedding models
docker exec -it ait_ollama sh -c "ollama pull mxbai-embed-large"
docker exec -it ait_ollama sh -c "ollama pull qwen3-embedding:latest"
docker exec -it ait_ollama sh -c "ollama pull bge-m3"
docker exec -it ait_ollama sh -c "ollama pull snowflake-arctic-embed"
```

## Adding Custom Models

To add a new model preset:

1. Edit `src/models.config.ts`
2. Add your model to the appropriate preset object:

```typescript
// For generation models
export const GENERATION_MODELS: Record<string, Omit<ModelSpec, "name">> = {
  // ... existing models
  "your-custom-model:tag": {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "Your custom model description",
  },
};

// For embedding models
export const EMBEDDING_MODELS: Record<string, Omit<ModelSpec, "name">> = {
  // ... existing models
  "your-embedding-model:tag": {
    vectorSize: 1024,
    description: "Your embedding model description",
  },
};
```

3. Pull the model in Ollama:

```bash
docker exec -it ait_ollama sh -c "ollama pull your-custom-model:tag"
```

4. Update your `.env` file:

```bash
GENERATION_MODEL=your-custom-model:tag
```

## Model Performance Characteristics

### Generation Models

**gpt-oss:20b** (Recommended)
- ✅ Best balance of quality and performance
- ✅ Excellent for reasoning and agentic tasks
- ✅ 128K context window for long-form content
- ⚠️ Requires ~16GB RAM minimum

**gpt-oss:120b**
- ✅ Highest quality reasoning
- ✅ Best for complex tasks
- ⚠️ Requires ~80GB GPU or high-end system
- ⚠️ Slower inference time

**qwen3:latest**
- ✅ Fast inference
- ✅ Good general-purpose performance
- ⚠️ Smaller context window (32K)

**deepseek-r1:latest**
- ✅ Strong reasoning capabilities
- ✅ Good for analytical tasks
- ⚠️ Smaller context window (32K)

### Embedding Models

**mxbai-embed-large** (Recommended)
- ✅ Best retrieval quality for semantic search
- ✅ Efficient 1024-dimensional vectors
- ✅ Fast embedding generation
- ✅ Recommended by benchmarks

**qwen3-embedding:latest**
- ✅ Works well with qwen3 generation model
- ⚠️ Larger vectors (4096 dims) = more storage
- ⚠️ Slower than mxbai-embed-large

**bge-m3**
- ✅ Excellent for multilingual use cases
- ✅ Good retrieval quality
- ✅ Efficient 1024-dimensional vectors

**snowflake-arctic-embed**
- ✅ Strong retrieval performance
- ✅ Optimized for RAG applications
- ✅ Efficient 1024-dimensional vectors

## Troubleshooting

### Model Not Found Error

If you see a warning about an unknown model:

```
Unknown generation model 'xyz'. Available models: ...
```

**Solution**: Either:
1. Pull the model: `docker exec -it ait_ollama sh -c "ollama pull xyz"`
2. Or check your `.env` file for typos in the model name

### Vector Size Mismatch

If embeddings fail due to size mismatch:

```
Unexpected embeddings size: 1024
```

**Solution**: Update the vector size in `.env`:

```bash
EMBEDDINGS_VECTOR_SIZE=1024
```

### Out of Memory

If Ollama crashes or refuses to load a model:

**Solution**: 
1. Use a smaller model (e.g., `gpt-oss:20b` instead of `gpt-oss:120b`)
2. Increase Docker memory limits
3. Check system resources with `docker stats`

## Best Practices

1. **For Production**: Use `gpt-oss:20b` + `mxbai-embed-large` (default setup)
2. **For Development**: Same as production for consistency
3. **For Testing**: Consider smaller/faster models if needed
4. **For Low-Resource Systems**: Use `qwen3:latest` + `mxbai-embed-large`
5. **For Maximum Quality**: Use `gpt-oss:120b` + `mxbai-embed-large` (if resources allow)

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `GENERATION_MODEL` | `gpt-oss:20b` | Name of the generation model |
| `EMBEDDINGS_MODEL` | `mxbai-embed-large` | Name of the embedding model |
| `GENERATION_VECTOR_SIZE` | `4096` | Vector size for generation model (optional) |
| `EMBEDDINGS_VECTOR_SIZE` | `1024` | Vector size for embedding model (optional) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |

## Additional Resources

- [Ollama Model Library](https://ollama.com/library)
- [GPT-OSS Model Card](https://ollama.com/library/gpt-oss)
- [MixedBread.ai Embeddings](https://ollama.com/library/mxbai-embed-large)
- [Model Configuration Source Code](./src/models.config.ts)

## License

[MIT](../../LICENSE)

