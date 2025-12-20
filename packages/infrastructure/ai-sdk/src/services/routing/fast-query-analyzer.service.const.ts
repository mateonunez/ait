import type { EntityType } from "@ait/core";

/**
 * Keyword patterns for entity type detection
 * Maps keywords to their corresponding entity types
 */
export const ENTITY_KEYWORDS: Record<string, EntityType[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // SPOTIFY
  // ═══════════════════════════════════════════════════════════════════════════

  // Spotify - English
  song: ["track"],
  songs: ["track"],
  track: ["track"],
  tracks: ["track"],
  music: ["track", "artist", "album", "playlist"],
  listening: ["recently_played"],
  listened: ["recently_played"],
  played: ["recently_played"],
  playing: ["recently_played"],
  "what i listened": ["recently_played"],
  "what i played": ["recently_played"],
  artist: ["artist"],
  artists: ["artist"],
  band: ["artist"],
  bands: ["artist"],
  musician: ["artist"],
  musicians: ["artist"],
  album: ["album"],
  albums: ["album"],
  record: ["album"],
  records: ["album"],
  playlist: ["playlist"],
  playlists: ["playlist"],
  mix: ["playlist"],
  mixes: ["playlist"],
  queue: ["playlist", "recently_played"],
  spotify: ["track", "artist", "album", "playlist", "recently_played"],
  "my music": ["track", "artist", "album", "playlist"],
  "my songs": ["track"],
  "my playlists": ["playlist"],
  "favorite songs": ["track"],
  "favorite tracks": ["track"],
  "favorite artists": ["artist"],
  "top tracks": ["track"],
  "top artists": ["artist"],

  // Spotify - Italian
  canzone: ["track"],
  canzoni: ["track"],
  brano: ["track"],
  brani: ["track"],
  musica: ["track", "artist", "album", "playlist"],
  ascoltando: ["recently_played"],
  ascoltato: ["recently_played"],
  "cosa ho ascoltato": ["recently_played"],
  artista: ["artist"],
  artisti: ["artist"],
  gruppo: ["artist"],
  gruppi: ["artist"],
  disco: ["album"],
  dischi: ["album"],
  suggeriscimi: ["track", "artist", "album", "playlist", "recently_played"],
  consigliami: ["track", "artist", "album", "playlist", "recently_played"],
  "le mie canzoni": ["track"],
  "la mia musica": ["track", "artist", "album", "playlist"],
  "le mie playlist": ["playlist"],
  preferiti: ["track", "artist"],
  preferite: ["track", "artist"],

  // Spotify - Spanish
  canción: ["track"],
  canciones: ["track"],
  música: ["track", "artist", "album", "playlist"],
  escuchando: ["recently_played"],
  escuchado: ["recently_played"],
  "lo que escuché": ["recently_played"],
  artistas: ["artist"],
  álbum: ["album"],
  álbumes: ["album"],
  discos: ["album"],
  recomienda: ["track", "artist", "album", "playlist", "recently_played"],
  recomiéndame: ["track", "artist", "album", "playlist", "recently_played"],
  sugiéreme: ["track", "artist", "album", "playlist", "recently_played"],
  "mis canciones": ["track"],
  "mi música": ["track", "artist", "album", "playlist"],
  "mis playlists": ["playlist"],
  favoritos: ["track", "artist"],
  favoritas: ["track", "artist"],

  // ═══════════════════════════════════════════════════════════════════════════
  // GITHUB
  // ═══════════════════════════════════════════════════════════════════════════

  // GitHub - Repository
  repo: ["repository"],
  repos: ["repository"],
  repository: ["repository"],
  repositories: ["repository"],
  branch: ["repository"],
  branches: ["repository"],
  "my repos": ["repository"],
  "my repositories": ["repository"],

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
  rust: ["repository_file"],
  go: ["repository_file"],
  java: ["repository_file"],
  kotlin: ["repository_file"],
  swift: ["repository_file"],

  // GitHub - Commits
  commit: ["commit"],
  commits: ["commit"],
  pushed: ["commit"],
  push: ["commit"],
  "my commits": ["commit"],
  "code changes": ["commit"],

  // GitHub - Pull Requests
  pr: ["pull_request"],
  prs: ["pull_request"],
  "pull request": ["pull_request"],
  "pull requests": ["pull_request"],
  merge: ["pull_request"],
  merged: ["pull_request"],
  "my prs": ["pull_request"],
  "open prs": ["pull_request"],
  "code review": ["pull_request"],

  // GitHub - General (routes to multiple types)
  github: ["repository", "pull_request", "repository_file", "commit"],

  // ═══════════════════════════════════════════════════════════════════════════
  // LINEAR
  // ═══════════════════════════════════════════════════════════════════════════

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
  todo: ["issue"],
  todos: ["issue"],
  "to do": ["issue"],
  "to-do": ["issue"],
  "my tasks": ["issue"],
  "my issues": ["issue"],
  "open issues": ["issue"],
  "assigned to me": ["issue"],
  bug: ["issue"],
  bugs: ["issue"],
  feature: ["issue"],
  features: ["issue"],

  // ═══════════════════════════════════════════════════════════════════════════
  // X/TWITTER
  // ═══════════════════════════════════════════════════════════════════════════

  tweet: ["tweet"],
  tweets: ["tweet"],
  twitter: ["tweet"],
  posted: ["tweet"],
  x: ["tweet"],
  "my tweets": ["tweet"],
  retweet: ["tweet"],
  retweets: ["tweet"],
  "social media": ["tweet"],

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTION
  // ═══════════════════════════════════════════════════════════════════════════

  note: ["page"],
  notes: ["page"],
  page: ["page"],
  pages: ["page"],
  document: ["page"],
  documents: ["page"],
  notion: ["page"],
  wiki: ["page"],
  docs: ["page"],
  "my notes": ["page"],
  "my docs": ["page"],
  "my documents": ["page"],
  documentation: ["page"],
  knowledge: ["page"],
  "knowledge base": ["page"],

  // ═══════════════════════════════════════════════════════════════════════════
  // SLACK
  // ═══════════════════════════════════════════════════════════════════════════

  slack: ["message"],
  channel: ["message"],
  channels: ["message"],
  message: ["message"],
  messages: ["message"],
  team: ["message"],
  "team chat": ["message"],
  dm: ["message"],
  dms: ["message"],
  "direct message": ["message"],
  "direct messages": ["message"],
  thread: ["message"],
  threads: ["message"],

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE CALENDAR
  // ═══════════════════════════════════════════════════════════════════════════

  event: ["event"],
  events: ["event"],
  meeting: ["event"],
  meetings: ["event"],
  calendar: ["event", "calendar"],
  calendars: ["calendar"],
  appointment: ["event"],
  appointments: ["event"],
  schedule: ["event"],
  scheduled: ["event"],
  "my calendar": ["event", "calendar"],
  "my events": ["event"],
  "my meetings": ["event"],
  "google calendar": ["event", "calendar"],
  invite: ["event"],
  invites: ["event"],
  invitation: ["event"],
  invitations: ["event"],
  agenda: ["event"],
  busy: ["event"],
  free: ["event"],
  availability: ["event"],

  // Google Calendar - Italian
  evento: ["event"],
  eventi: ["event"],
  riunione: ["event"],
  riunioni: ["event"],
  appuntamento: ["event"],
  appuntamenti: ["event"],
  calendario: ["event", "calendar"],
  "il mio calendario": ["event", "calendar"],
  "i miei eventi": ["event"],
  "le mie riunioni": ["event"],

  // Google Calendar - Spanish
  reunion: ["event"],
  reuniones: ["event"],
  reunión: ["event"],
  cita: ["event"],
  citas: ["event"],
  horario: ["event"],
  "mi calendario": ["event", "calendar"],
  "mis eventos": ["event"],
  "mis reuniones": ["event"],

  // ═══════════════════════════════════════════════════════════════════════════
  // YOUTUBE
  // ═══════════════════════════════════════════════════════════════════════════

  subscription: ["subscription"],
  subscriptions: ["subscription"],
  youtube: ["subscription"],
  "youtube channel": ["subscription"],
  "youtube channels": ["subscription"],
  subscribed: ["subscription"],
  "my subscriptions": ["subscription"],
  "channels i follow": ["subscription"],
  video: ["subscription"],
  videos: ["subscription"],
};
/**
 * Temporal patterns for detecting time-related queries
 * Includes English, Italian, and Spanish patterns
 */
export const TEMPORAL_PATTERNS: Array<{ pattern: RegExp; reference: string }> = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ENGLISH
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /\b(today|tonight)\b/i, reference: "today" },
  { pattern: /\byesterday\b/i, reference: "yesterday" },
  { pattern: /\btomorrow\b/i, reference: "tomorrow" },
  { pattern: /\blast\s+(week|month|year)\b/i, reference: "last $1" },
  { pattern: /\bthis\s+(week|month|year)\b/i, reference: "this $1" },
  { pattern: /\bnext\s+(week|month|year)\b/i, reference: "next $1" },
  { pattern: /\b(\d+)\s+(day|week|month|year)s?\s+ago\b/i, reference: "$1 $2 ago" },
  { pattern: /\brecently?\b/i, reference: "recent" },
  { pattern: /\blast\s+(\d+)\s+(day|hour|minute)s?\b/i, reference: "last $1 $2" },
  { pattern: /\b(morning|afternoon|evening|night)\b/i, reference: "today" },
  { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, reference: "$1" },
  {
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    reference: "$1",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITALIAN
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /\b(oggi|stasera|stanotte)\b/i, reference: "today" },
  { pattern: /\bieri\b/i, reference: "yesterday" },
  { pattern: /\bdomani\b/i, reference: "tomorrow" },
  { pattern: /\b(la\s+)?settimana\s+(scorsa|passata)\b/i, reference: "last week" },
  { pattern: /\b(il\s+)?mese\s+(scorso|passato)\b/i, reference: "last month" },
  { pattern: /\b(l')?anno\s+(scorso|passato)\b/i, reference: "last year" },
  { pattern: /\bquesta\s+settimana\b/i, reference: "this week" },
  { pattern: /\bquesto\s+mese\b/i, reference: "this month" },
  { pattern: /\bquest'anno\b/i, reference: "this year" },
  { pattern: /\bprossima\s+settimana\b/i, reference: "next week" },
  { pattern: /\bprossimo\s+mese\b/i, reference: "next month" },
  { pattern: /\bprossimo\s+anno\b/i, reference: "next year" },
  { pattern: /\b(\d+)\s+(giorn[oi]|settiman[ae]|mes[ei]|ann[oi])\s+fa\b/i, reference: "$1 $2 ago" },
  { pattern: /\b(mattina|pomeriggio|sera|notte)\b/i, reference: "today" },
  { pattern: /\b(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\b/i, reference: "$1" },
  {
    pattern: /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i,
    reference: "$1",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPANISH
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /\b(hoy|esta\s+noche)\b/i, reference: "today" },
  { pattern: /\bayer\b/i, reference: "yesterday" },
  { pattern: /\bmañana\b/i, reference: "tomorrow" },
  { pattern: /\b(la\s+)?semana\s+pasada\b/i, reference: "last week" },
  { pattern: /\b(el\s+)?mes\s+pasado\b/i, reference: "last month" },
  { pattern: /\b(el\s+)?año\s+pasado\b/i, reference: "last year" },
  { pattern: /\besta\s+semana\b/i, reference: "this week" },
  { pattern: /\beste\s+mes\b/i, reference: "this month" },
  { pattern: /\beste\s+año\b/i, reference: "this year" },
  { pattern: /\bpróxima\s+semana\b/i, reference: "next week" },
  { pattern: /\bpróximo\s+mes\b/i, reference: "next month" },
  { pattern: /\bpróximo\s+año\b/i, reference: "next year" },
  { pattern: /\bhace\s+(\d+)\s+(día|semana|mes|año)s?\b/i, reference: "$1 $2 ago" },
  { pattern: /\b(mañana|tarde|noche)\b/i, reference: "today" },
  { pattern: /\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i, reference: "$1" },
  {
    pattern: /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i,
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
