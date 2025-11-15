# Ollama

## Overview

Ollama provides local LLM processing for AIt. It runs generation models (like gpt-oss:20b) and embedding models (like mxbai-embed-large) for text generation and semantic search.

## Quick Start

Ollama is automatically started with other services:

```bash
pnpm start:services  # From root directory
```

Access Ollama shell:

```bash
docker exec -it ait_ollama sh
```

## Configuration

Set the following environment variable to customize the connection:

```bash
OLLAMA_BASE_URL=http://localhost:11434  # Default
```

## Model Installation

### Required Models

Install the default models used by AIt:

```bash
# Generation model (GPT-OSS 20B)
docker exec -it ait_ollama sh -c "ollama pull gpt-oss:20b"

# Embedding model (MixedBread.ai large)
docker exec -it ait_ollama sh -c "ollama pull mxbai-embed-large"
```

### Alternative Models

You can also install alternative models:

```bash
# Generation models
ollama pull gpt-oss:120b        # Larger GPT-OSS model (65GB)
ollama pull qwen3:latest         # Qwen3 model
ollama pull deepseek-r1:latest  # DeepSeek R1 reasoning model

# Embedding models
ollama pull qwen3-embedding:latest  # Qwen3 embeddings
ollama pull bge-m3                  # BGE multilingual embeddings
ollama pull snowflake-arctic-embed  # Snowflake Arctic embeddings
```

See the [AI SDK README](../ai-sdk/README.md) for details on model configuration and usage.

## Usage

Ollama is used by the [AI SDK](../ai-sdk/README.md) for:
- Text generation with RAG
- Embedding generation for semantic search
- Tool calling and agentic tasks

Models are configured via environment variables or the AI SDK initialization. See the [AI SDK documentation](../ai-sdk/README.md) for usage examples.

## Development

Access Ollama API directly at `http://localhost:11434` for testing and debugging.

## License

[MIT](../../LICENSE)
