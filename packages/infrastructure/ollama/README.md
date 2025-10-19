# Ollama

## Overview

```bash
docker exec -it ait_ollama sh
```

## Install the models

**Generation model (GPT-OSS 20B)**:

```bash
ollama pull gpt-oss:20b
```

**Embedding model (MixedBread.ai large)**:

```bash
ollama pull mxbai-embed-large
```

## Available Models

You can also install alternative models:

```bash
# Generation models
ollama pull gpt-oss:120b     # Larger GPT-OSS model (65GB)
ollama pull qwen3:latest      # Qwen3 model
ollama pull deepseek-r1:latest # DeepSeek R1 reasoning model

# Embedding models
ollama pull qwen3-embedding:latest  # Qwen3 embeddings
ollama pull bge-m3                   # BGE multilingual embeddings
ollama pull snowflake-arctic-embed   # Snowflake Arctic embeddings
```

See `../langchain/MODELS.md` for more details on model configuration and switching.

### License

[MIT](../../LICENSE)
