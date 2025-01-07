#!/usr/bin/env python3

import sys
import json
from transformers import AutoTokenizer, AutoModel

model_name = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

def generate_embedding(text: str):
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    embedding = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
    return embedding

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_embeddings.py <text to embed>")
        sys.exit(1)

    text = sys.argv[1]
    embedding = generate_embedding(text)

    print(json.dumps(embedding))  # Convert to list for JSON output

if __name__ == "__main__":
    main()
