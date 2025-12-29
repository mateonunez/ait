import type { EntityType } from "./entities";
import { VALID_ENTITY_TYPES } from "./entities";

export const SUPPORTED_VENDORS = ["spotify", "github", "linear", "x", "notion", "slack", "google"] as const;

export type IntegrationVendor = (typeof SUPPORTED_VENDORS)[number];

export interface EntityMetadata {
  label: string;
  labelPlural: string;
  keywords: readonly string[];
  vendor: IntegrationVendor;
  description: string;
  timestampFields: readonly string[];
}

export const ENTITY_METADATA: Record<EntityType, EntityMetadata> = {
  // Spotify entities
  spotify_track: {
    label: "Song",
    labelPlural: "Songs",
    keywords: [
      "spotify_track",
      // English
      "song",
      "track",
      "music",
      "listening",
      "playing",
      "played",
      "tune",
      "melody",
      // Italian
      "canzone",
      "traccia",
      "musica",
      "ascoltando",
      "suonando",
      "ascoltato",
      "brano",
      // Spanish
      "canción",
      "pista",
      "música",
      "escuchando",
      "reproduciendo",
      "reproducido",
      "tema",
    ],
    vendor: "spotify",
    description: "Spotify tracks in library (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  spotify_artist: {
    label: "Artist",
    labelPlural: "Artists",
    keywords: [
      "spotify_artist",
      // English
      "artist",
      "musician",
      "band",
      "singer",
      "performer",
      "group",
      // Italian
      "artista",
      "musicista",
      "band",
      "cantante",
      "gruppo",
      "complesso",
      // Spanish
      "artista",
      "músico",
      "banda",
      "cantante",
      "grupo",
      "intérprete",
    ],
    vendor: "spotify",
    description: "Spotify artists followed (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  spotify_playlist: {
    label: "Playlist",
    labelPlural: "Playlists",
    keywords: [
      "spotify_playlist",
      // English
      "playlist",
      "collection",
      "compilation",
      "mixtape",
      "mix",
      // Italian
      "playlist",
      "raccolta",
      "compilation",
      "lista",
      "selezione",
      // Spanish
      "lista de reproducción",
      "colección",
      "compilación",
      "mezcla",
      "lista",
    ],
    vendor: "spotify",
    description: "Spotify playlists (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  spotify_album: {
    label: "Album",
    labelPlural: "Albums",
    keywords: [
      "spotify_album",
      // English
      "album",
      "record",
      "lp",
      "release",
      "ep",
      // Italian
      "album",
      "disco",
      "lp",
      "rilascio",
      "ep",
      // Spanish
      "álbum",
      "disco",
      "lp",
      "lanzamiento",
      "ep",
    ],
    vendor: "spotify",
    description: "Spotify albums (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  spotify_recently_played: {
    label: "Recently Played",
    labelPlural: "Recently Played",
    keywords: [
      "spotify_recently_played",
      // English
      "recently played",
      "history",
      "recent",
      "listened",
      "past tracks",
      // Italian
      "ascoltati di recente",
      "cronologia",
      "recente",
      "ascoltati",
      "brani passati",
      // Spanish
      "reproducido recientemente",
      "historial",
      "reciente",
      "escuchado",
      "pistas pasadas",
    ],
    vendor: "spotify",
    description: "Spotify tracks that were actually played (timestamps: playedAt - THE ACTUAL PLAY TIME)",
    timestampFields: ["playedAt"],
  },

  // GitHub entities
  github_repository: {
    label: "Repository",
    labelPlural: "Repositories",
    keywords: [
      "github_repository",
      // English
      "repo",
      "repository",
      "source",
      "code",
      "git",
      "github",
      "codebase",
      // Italian
      "repository",
      "codice sorgente",
      "sorgente",
      "codice",
      // Spanish
      "repositorio",
      "código fuente",
      "fuente",
      "código",
    ],
    vendor: "github",
    description: "GitHub repositories (timestamps: pushedAt)",
    timestampFields: ["pushedAt", "createdAt", "updatedAt"],
  },
  github_pull_request: {
    label: "Pull Request",
    labelPlural: "Pull Requests",
    keywords: [
      "github_pull_request",
      // English
      "pull request",
      "pr",
      "merge",
      "code review",
      "github",
      "git",
      // Italian
      "richiesta di pull",
      "revisione codice",
      "fusione",
      "modifiche",
      // Spanish
      "solicitud de extracción",
      "revisión de código",
      "fusión",
      "cambios",
    ],
    vendor: "github",
    description: "GitHub pull requests (timestamps: mergedAt, closedAt)",
    timestampFields: ["mergedAt", "closedAt", "createdAt", "updatedAt"],
  },
  github_commit: {
    label: "Commit",
    labelPlural: "Commits",
    keywords: [
      "github_commit",
      // English
      "commit",
      "code change",
      "git",
      "github",
      "diff",
      "revision",
      // Italian
      "commit",
      "modifica",
      "revisione",
      "differenza",
      "cronologia",
      // Spanish
      "commit",
      "cambio de código",
      "revisión",
      "diferencia",
      "historial",
    ],
    vendor: "github",
    description: "GitHub commits with diffs and file changes (timestamps: authorDate, committerDate)",
    timestampFields: ["authorDate", "committerDate", "createdAt", "updatedAt"],
  },
  github_file: {
    label: "Code File",
    labelPlural: "Code Files",
    keywords: [
      "github_file",
      // English
      "file",
      "code",
      "source",
      "implementation",
      "class",
      "function",
      "module",
      "script",
      // Italian
      "file",
      "codice",
      "sorgente",
      "implementazione",
      "classe",
      "funzione",
      "modulo",
      "script",
      // Spanish
      "archivo",
      "código",
      "fuente",
      "implementación",
      "clase",
      "función",
      "módulo",
      "script",
    ],
    vendor: "github",
    description: "Repository source code files (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // Linear entities
  linear_issue: {
    label: "Issue",
    labelPlural: "Issues",
    keywords: [
      "linear_issue",
      // English
      "issue",
      "task",
      "ticket",
      "project",
      "kanban",
      "bug",
      "linear",
      "feature",
      // Italian
      "problema",
      "attività",
      "ticket",
      "progetto",
      "bug",
      "funzionalità",
      // Spanish
      "problema",
      "tarea",
      "ticket",
      "proyecto",
      "error",
      "funcionalidad",
    ],
    vendor: "linear",
    description: "Linear issues (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // X (Twitter) entities
  x_tweet: {
    label: "Tweet",
    labelPlural: "Tweets",
    keywords: [
      "x_tweet",
      // English
      "tweet",
      "microblog",
      "twitter",
      "x.com",
      "x",
      "posted",
      "retweeted",
      "social",
      "post",
      // Italian
      "tweet",
      "post",
      "cinguettio",
      "messaggio",
      "social",
      // Spanish
      "tuit",
      "publicación",
      "mensaje",
      "social",
    ],
    vendor: "x",
    description: "Twitter/X posts (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },

  // Notion entities
  notion_page: {
    label: "Page",
    labelPlural: "Pages",
    keywords: [
      "notion_page",
      // English
      "page",
      "notion",
      "note",
      "document",
      "wiki",
      "knowledge",
      "docs",
      // Italian
      "pagina",
      "notion",
      "nota",
      "documento",
      "conoscenza",
      // Spanish
      "página",
      "notion",
      "nota",
      "documento",
      "conocimiento",
    ],
    vendor: "notion",
    description: "Notion pages and notes (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // Slack entities
  slack_message: {
    label: "Message",
    labelPlural: "Messages",
    keywords: [
      "slack_message",
      // English
      "message",
      "slack",
      "channel",
      "team",
      "communication",
      "chat",
      "dm",
      // Italian
      "messaggio",
      "canale",
      "team",
      "comunicazione",
      "chat",
      // Spanish
      "mensaje",
      "canal",
      "equipo",
      "comunicación",
      "chat",
    ],
    vendor: "slack",
    description: "Slack messages (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // Google entities (Calendar, Drive, etc.)
  google_calendar_event: {
    label: "Event",
    labelPlural: "Events",
    keywords: [
      "google_calendar_event",
      // English
      "event",
      "meeting",
      "schedule",
      "appointment",
      "google calendar",
      "invite",
      // Italian
      "evento",
      "riunione",
      "programma",
      "appuntamento",
      "calendario",
      "invito",
      // Spanish
      "evento",
      "reunión",
      "horario",
      "cita",
      "calendario",
      "invitación",
    ],
    vendor: "google",
    description: "Google Calendar events and meetings (timestamps: startTime, endTime, createdAt)",
    timestampFields: ["startTime", "endTime", "createdAt"],
  },
  google_calendar_calendar: {
    label: "Calendar",
    labelPlural: "Calendars",
    keywords: [
      "google_calendar_calendar",
      // English
      "calendar",
      "schedule",
      "agenda",
      "google calendar",
      // Italian
      "calendario",
      "programma",
      "agenda",
      // Spanish
      "calendario",
      "horario",
      "agenda",
    ],
    vendor: "google",
    description: "Google Calendar calendars (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  google_youtube_subscription: {
    label: "Subscription",
    labelPlural: "Subscriptions",
    keywords: [
      "google_youtube_subscription",
      // English
      "youtube",
      "channel",
      "video",
      "subscribe",
      "following",
      "subscription",
      // Italian
      "youtube",
      "canale",
      "video",
      "iscriviti",
      "seguendo",
      "iscrizione",
      // Spanish
      "youtube",
      "canal",
      "video",
      "suscribirse",
      "siguiendo",
      "suscripción",
    ],
    vendor: "google",
    description: "YouTube channel subscriptions (timestamps: publishedAt)",
    timestampFields: ["publishedAt"],
  },
  google_contact: {
    label: "Contact",
    labelPlural: "Contacts",
    keywords: [
      "google_contact",
      // English
      "contact",
      "google",
      "person",
      "people",
      "profile",
      "name",
      "info",
      "email",
      "phone",
      "organization",
      "company",
      "address",
      // Italian
      "contatto",
      "persona",
      "persone",
      "profilo",
      "nome",
      "info",
      "email",
      "telefono",
      "organizzazione",
      "azienda",
      "indirizzo",
      // Spanish
      "contacto",
      "persona",
      "gente",
      "perfil",
      "nombre",
      "info",
      "email",
      "teléfono",
      "organización",
      "empresa",
      "dirección",
    ],
    vendor: "google",
    description: "Google contacts (timestamps: updatedAt)",
    timestampFields: ["updatedAt"],
  },
  google_photo: {
    label: "Photo",
    labelPlural: "Photos",
    keywords: [
      "google_photo",
      // English
      "photo",
      "image",
      "picture",
      "google photos",
      "video",
      "media",
      "camera",
      "shot",
      "memory",
      // Italian
      "foto",
      "immagine",
      "google foto",
      "video",
      "media",
      "fotocamera",
      "scatto",
      "ricordo",
      // Spanish
      "foto",
      "imagen",
      "google fotos",
      "video",
      "media",
      "cámara",
      "toma",
      "recuerdo",
    ],
    vendor: "google",
    description: "Google Photos media items (timestamps: creationTime, updatedAt)",
    timestampFields: ["creationTime", "updatedAt"],
  },
} as const;

export function getEntityMetadata(entityType: EntityType): EntityMetadata {
  return ENTITY_METADATA[entityType];
}

export function getEntityTypesByVendor(vendor: IntegrationVendor): EntityType[] {
  return VALID_ENTITY_TYPES.filter((type) => ENTITY_METADATA[type].vendor === vendor);
}

export function getEntityKeywords(entityType: EntityType): readonly string[] {
  return ENTITY_METADATA[entityType].keywords;
}

export function getVendorKeywords(vendor: IntegrationVendor): readonly string[] {
  const keywords: string[] = [];
  for (const type of getEntityTypesByVendor(vendor)) {
    keywords.push(...ENTITY_METADATA[type].keywords);
  }
  return keywords;
}

export function findEntityTypesByKeywords(keywords: string[]): EntityType[] {
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));
  const matchingTypes: EntityType[] = [];

  for (const [type, metadata] of Object.entries(ENTITY_METADATA)) {
    if (metadata.keywords.some((kw) => keywordSet.has(kw.toLowerCase()))) {
      matchingTypes.push(type as EntityType);
    }
  }

  return matchingTypes;
}

export function getEntityLabel(entityType: EntityType, plural = false): string {
  const metadata = ENTITY_METADATA[entityType];
  return plural ? metadata.labelPlural : metadata.label;
}

export function getEntityDescriptions(): string {
  return VALID_ENTITY_TYPES.map((type) => {
    const meta = ENTITY_METADATA[type];
    return `- ${type}: ${meta.description}`;
  }).join("\n");
}
