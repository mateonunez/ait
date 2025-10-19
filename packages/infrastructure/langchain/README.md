# LangChain (legacy) and Ollama

## Overview

This package provides LangChain integration with Ollama for local LLM processing.

## Install the models

Access the Ollama container:

```bash
docker exec -it ait_ollama sh
```

**Install the generation model**:

```bash
ollama pull gpt-oss:20b
```

**Install the embedding model**:

```bash
ollama pull mxbai-embed-large
```

## Model Configuration

The package uses a centralized model configuration system. See `MODELS.md` for details on:
- Available model presets
- How to switch models via environment variables
- Model specifications (vector sizes, context windows)
- Adding custom models

## Default Collection Name

This package now reads the default Qdrant collection from `DEFAULT_RAG_COLLECTION`. If unset, it falls back to `rag_default_collection`.

### License

[MIT](../../LICENSE)
