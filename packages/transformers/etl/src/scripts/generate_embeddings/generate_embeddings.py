#!/usr/bin/env python3

import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer

model_name = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(model_name)

def generate_embedding(text: str):
    embedding = model.encode(text)
    return embedding

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_embeddings.py <text to embed>")
        sys.exit(1)

    text = sys.argv[1]
    embedding = generate_embedding(text)

    print(json.dumps(embedding.tolist()))  # Convert to list for JSON output

if __name__ == "__main__":
    main()
