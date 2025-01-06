import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const oauthTokens = pgTable("oauth_tokens", {
  id: varchar("id", { length: 255 }).primaryKey(),
  accessToken: varchar("access_token", { length: 255 }),
  tokenType: varchar("token_type", { length: 255 }),
  expiresIn: varchar("expires_in", { length: 255 }),
  refreshToken: varchar("refresh_token", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  provider: varchar("provider", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DATA TARGET
 * Represents how we store the OAuth token data in a data layer (DB)
 */
export type OAuthTokenDataTarget = typeof oauthTokens.$inferInsert;
