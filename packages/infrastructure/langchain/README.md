# LangChain (legacy) and Ollama

## Overview

```bash
docker exec -it ait_ollama sh
```

**Install the model**:

```bash
ollama pull qwen3:latest

## Default Collection Name

This package now reads the default Qdrant collection from `DEFAULT_RAG_COLLECTION`. If unset, it falls back to `rag_default_collection`.

```

### License

[MIT](../../LICENSE)
