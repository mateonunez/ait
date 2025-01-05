# ETL

## Overview

### Generating Embeddings


#### With Python

```bash
cd src/scrpits/generate_embeddings
```

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

```bash
python generate_embeddings.py
```

#### With Ollama SDK

Use the `generateEmbeddings` method from `etl.embeddings.service` to generate embeddings.

#### With LangChain

Use the `generateLangchainEmbeddings` method from `etl.embeddings.service` to generate embeddings.

> WIP

### License

[MIT](../../LICENSE)
