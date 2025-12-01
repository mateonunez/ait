import type { BaseMetadata, Document } from "../../types/documents";

export const buildRerankPrompt = (query: string, documents: Document<BaseMetadata>[], previewLength = 300) => {
  const docsText = documents.map((doc, i) => `[${i}] ${doc.pageContent.slice(0, previewLength)}`).join("\n\n");

  return `Rate document relevance to the query on a scale of 0-10 (10=highly relevant, 0=irrelevant).

Query: "${query}"

Criteria for relevance:
- Direct answer: Does it contain the specific information requested?
- Semantic match: Is it about the same topic?
- Contextual fit: Does it match the user's intent?

Documents:
${docsText}

Return JSON:
{
  "scores": [
    { "index": 0, "relevance": 8 },
    { "index": 1, "relevance": 3 },
    ...
  ]
}

Score ALL ${documents.length} documents. Return ONLY the JSON object.`;
};
