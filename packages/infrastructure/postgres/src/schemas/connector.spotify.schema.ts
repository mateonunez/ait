import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const spotifyTracks = pgTable("spotify_tracks", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  album: varchar("album", { length: 255 }),
  durationMs: integer("duration_ms").notNull(),
  explicit: boolean("explicit").notNull().default(false),
  isPlayable: boolean("is_playable"),
  previewUrl: varchar("preview_url", { length: 512 }),
  trackNumber: integer("track_number"),
  discNumber: integer("disc_number"),
  uri: varchar("uri", { length: 255 }),
  href: varchar("href", { length: 512 }),
  isLocal: boolean("is_local").notNull().default(false),
  popularity: integer("popularity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DATA TARGET
 * Represents how we store the domain entity in a data layer (DB)
 */
export type SpotifyTrackDataTarget = typeof spotifyTracks.$inferInsert;

export const spotifyArtists = pgTable("spotify_artists", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  popularity: integer("popularity"),
  genres: text("genres").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SpotifyArtistDataTarget = typeof spotifyArtists.$inferInsert;

export const spotifyPlaylists = pgTable("spotify_playlists", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  public: boolean("public").notNull().default(false),
  collaborative: boolean("collaborative").notNull().default(false),
  owner: varchar("owner", { length: 255 }).notNull(),
  tracks: integer("tracks").notNull().default(0),
  followers: integer("followers").notNull().default(0),
  snapshotId: varchar("snapshot_id", { length: 255 }).notNull(),
  uri: varchar("uri", { length: 255 }).notNull(),
  href: varchar("href", { length: 512 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SpotifyPlaylistDataTarget = typeof spotifyPlaylists.$inferInsert;
