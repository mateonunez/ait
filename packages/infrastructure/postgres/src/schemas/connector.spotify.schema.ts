import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const spotifyTracks = pgTable("spotify_tracks", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  album: varchar("album", { length: 255 }),
  durationMs: integer("duration_ms").notNull(),
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
});

export type SpotifyArtistDataTarget = typeof spotifyArtists.$inferInsert;
