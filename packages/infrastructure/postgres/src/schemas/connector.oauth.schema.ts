import { randomUUID } from "node:crypto";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { connectorConfigs } from "./connector-configs.schema";

export const oauthTokens = pgTable("oauth_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  accessToken: text("access_token"),
  tokenType: text("token_type"),
  expiresIn: text("expires_in"),
  refreshToken: text("refresh_token"),
  scope: text("scope"),
  provider: text("provider"),
  userId: text("user_id").notNull(),
  connectorConfigId: text("connector_config_id").references(() => connectorConfigs.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type OAuthTokenDataTarget = typeof oauthTokens.$inferInsert;
