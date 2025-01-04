import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const githubRepositories = pgTable("github_repositories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  stars: integer("stars").notNull(),
  forks: integer("forks").notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  language: varchar("language", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DATA TARGET
 * Represents how we store the domain entity in a data layer (DB)
 */
export interface GitHubRepositoryDataTarget {
  id: string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}
