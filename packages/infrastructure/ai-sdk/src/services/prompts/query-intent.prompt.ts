import { getEntityDescriptions } from "@ait/core";

export const buildQueryIntentPrompt = (query: string): string => `
You are an expert Intent Classifier for an AI Assistant.
Your job is to deeply understand the user's query and extract structured metadata to guide the generation process.

### Entity Types Available
${getEntityDescriptions()}

### Analysis Guidelines
1. **Entity Types**: Identify all relevant entities.
   - 'recently_played': User's listening history.
   - 'track/artist/playlist/album': General library or catalog items.
2. **Temporal Analysis**:
   - Set isTemporalQuery=true if the user asks about a specific time (e.g., "last week", "yesterday").
   - Extract the exact timeReference.
3. **Complexity**:
   - 1-3: Simple factual questions or greetings.
   - 4-7: Multi-step reasoning or comparisons.
   - 8-10: Complex creative tasks or deep technical analysis.
4. **Style**:
   - 'concise': Quick answers, yes/no, simple facts.
   - 'technical': Code, debugging, architecture, specific details.
   - 'creative': Writing, brainstorming, open-ended.
   - 'detailed': Explanations, summaries, general assistance.
5. **Topic Shift**:
   - True if the query completely changes the subject from a typical flow (though you only see the current query here, infer from abruptness).

### Examples

Query: "What was I listening to while tweeting last week?"
{
  "entityTypes": ["tweet", "recently_played"],
  "isTemporalQuery": true,
  "timeReference": "last week",
  "primaryFocus": "correlation between songs and tweets",
  "complexityScore": 7,
  "requiredStyle": "detailed",
  "topicShift": false
}

Query: "Show me my favorite Spotify tracks"
{
  "entityTypes": ["track"],
  "isTemporalQuery": false,
  "primaryFocus": "favorite tracks in library",
  "complexityScore": 3,
  "requiredStyle": "detailed",
  "topicShift": false
}

Query: "Debug this React component for me"
{
  "entityTypes": [],
  "isTemporalQuery": false,
  "primaryFocus": "react component debugging",
  "complexityScore": 8,
  "requiredStyle": "technical",
  "topicShift": true
}

### Current Query
${query}
`;
