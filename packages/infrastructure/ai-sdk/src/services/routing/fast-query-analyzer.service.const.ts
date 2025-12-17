import type { EntityType } from "@ait/core";

/**
 * Keyword patterns for entity type detection
 * Maps keywords to their corresponding entity types
 */
export const ENTITY_KEYWORDS: Record<string, EntityType[]> = {
  // Spotify
  song: ["track"],
  songs: ["track"],
  track: ["track"],
  tracks: ["track"],
  music: ["track", "artist", "album", "playlist"],
  listening: ["recently_played"],
  listened: ["recently_played"],
  played: ["recently_played"],
  playing: ["recently_played"],
  artist: ["artist"],
  artists: ["artist"],
  album: ["album"],
  albums: ["album"],
  playlist: ["playlist"],
  playlists: ["playlist"],
  spotify: ["track", "artist", "album", "playlist", "recently_played"],

  // GitHub - Repository
  repo: ["repository"],
  repos: ["repository"],
  repository: ["repository"],
  repositories: ["repository"],
  branch: ["repository"],

  // GitHub - Code/Files (repository_file)
  code: ["repository", "pull_request", "repository_file"],
  file: ["repository_file"],
  files: ["repository_file"],
  function: ["repository_file"],
  functions: ["repository_file"],
  class: ["repository_file"],
  classes: ["repository_file"],
  method: ["repository_file"],
  methods: ["repository_file"],
  module: ["repository_file"],
  modules: ["repository_file"],
  interface: ["repository_file"],
  interfaces: ["repository_file"],
  type: ["repository_file"],
  types: ["repository_file"],
  import: ["repository_file"],
  imports: ["repository_file"],
  export: ["repository_file"],
  exports: ["repository_file"],
  source: ["repository_file"],
  implementation: ["repository_file"],
  // Language-specific
  typescript: ["repository_file"],
  javascript: ["repository_file"],
  python: ["repository_file"],
  tsx: ["repository_file"],
  jsx: ["repository_file"],
  ts: ["repository_file"],
  js: ["repository_file"],
  py: ["repository_file"],

  // GitHub - Commits
  commit: ["commit"],
  commits: ["commit"],
  pushed: ["commit"],
  push: ["commit"],

  // GitHub - Pull Requests
  pr: ["pull_request"],
  prs: ["pull_request"],
  "pull request": ["pull_request"],
  "pull requests": ["pull_request"],
  merge: ["pull_request"],
  merged: ["pull_request"],

  // GitHub - General (routes to multiple types)
  github: ["repository", "pull_request", "repository_file", "commit"],

  // Linear
  task: ["issue"],
  tasks: ["issue"],
  issue: ["issue"],
  issues: ["issue"],
  ticket: ["issue"],
  tickets: ["issue"],
  project: ["issue"],
  projects: ["issue"],
  linear: ["issue"],
  backlog: ["issue"],
  sprint: ["issue"],

  // X/Twitter
  tweet: ["tweet"],
  tweets: ["tweet"],
  twitter: ["tweet"],
  posted: ["tweet"],
  x: ["tweet"],

  // Notion
  note: ["page"],
  notes: ["page"],
  page: ["page"],
  pages: ["page"],
  document: ["page"],
  documents: ["page"],
  notion: ["page"],
  wiki: ["page"],
  docs: ["page"],

  // Slack
  slack: ["message"],
  channel: ["message"],
  message: ["message"],
  messages: ["message"],
  team: ["message"],
};
/**
 * Temporal patterns for detecting time-related queries
 */
export const TEMPORAL_PATTERNS: Array<{ pattern: RegExp; reference: string }> = [
  { pattern: /\b(today|tonight)\b/i, reference: "today" },
  { pattern: /\byesterday\b/i, reference: "yesterday" },
  { pattern: /\blast\s+(week|month|year)\b/i, reference: "last $1" },
  { pattern: /\bthis\s+(week|month|year)\b/i, reference: "this $1" },
  { pattern: /\b(\d+)\s+(day|week|month|year)s?\s+ago\b/i, reference: "$1 $2 ago" },
  { pattern: /\brecently?\b/i, reference: "recent" },
  { pattern: /\blast\s+(\d+)\s+(day|hour|minute)s?\b/i, reference: "last $1 $2" },
  { pattern: /\b(morning|afternoon|evening|night)\b/i, reference: "today" },
  { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, reference: "$1" },
  {
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    reference: "$1",
  },
];
/**
 * Patterns that indicate broad/ambiguous queries requiring all collections
 */
export const BROAD_QUERY_PATTERNS: RegExp[] = [
  /^what\s+can\s+you\s+do/i,
  /^(give|show)\s+me\s+(an?\s+)?overview/i,
  /^summarize\s+(everything|all|my\s+data)/i,
  /^(tell|show)\s+me\s+(about\s+)?(everything|all|my\s+data)/i,
];
/**
 * Patterns for greeting/conversational queries that should SKIP RAG entirely
 */
export const GREETING_PATTERNS: RegExp[] = [
  // English greetings
  /^(hello|hi|hey|greetings|howdy|yo)\b/i,
  /^(good\s+)?(morning|afternoon|evening|night)\b/i,
  /^what's\s+up\b/i,
  /^how\s+are\s+you/i,
  // Italian greetings
  /^(ciao|salve|buongiorno|buonasera|buonanotte)\b/i,
  // Spanish greetings
  /^(hola|buenos\s+días|buenas\s+tardes|buenas\s+noches)\b/i,
  // Conversational meta-queries (what are you / who are you)
  /^(what|who)\s+(are|is)\s+(you|ait|this)/i,
  /^(tell|show)\s+me\s+(about\s+)?(yourself|you)\b/i,
  // Capability questions (should skip RAG - AI answers from training)
  /^what\s+can\s+you\s+do/i,
  /^what\s+are\s+you\s+(able|capable)\s+(of|to)/i,
  /^cosa\s+(puoi|sai|sei\s+in\s+grado\s+di)\s+fare/i, // Italian: what can you do
  /^qu[eé]\s+puedes\s+hacer/i, // Spanish: what can you do
  /^can\s+you\s+help\s+me/i,
  /^help$/i,
  /^thanks?\b/i,
  /^thank\s+you\b/i,
  /^(bye|goodbye|see\s+you)\b/i,
];
/**
 * Patterns for technical queries
 */
export const TECHNICAL_PATTERNS: RegExp[] = [
  /\b(debug|fix|error|bug|issue|problem)\b/i,
  /\b(code|function|class|method|api|endpoint)\b/i,
  /\b(implement|refactor|optimize|performance)\b/i,
  /\b(test|spec|unit|integration)\b/i,
];
