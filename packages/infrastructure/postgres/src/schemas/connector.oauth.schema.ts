import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const oauthTokens = pgTable("oauth_tokens", {
  id: text("id").primaryKey().default(randomUUID()),
  accessToken: text("access_token"),
  tokenType: text("token_type"),
  expiresIn: text("expires_in"),
  refreshToken: text("refresh_token"),
  scope: text("scope"),
  provider: text("provider"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DATA TARGET
 * Represents how we store the OAuth token data in a data layer (DB)
 */
export type OAuthTokenDataTarget = typeof oauthTokens.$inferInsert;
