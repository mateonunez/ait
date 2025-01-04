import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const githubRepositories = pgTable("github_repositories", {
  id: serial("id").primaryKey(),
  repositoryId: varchar("repository_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  stars: integer("stars").notNull(),
  forks: integer("forks").notNull(),
  language: varchar("language", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
