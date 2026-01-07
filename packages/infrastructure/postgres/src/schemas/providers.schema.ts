import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { connectorConfigs } from "./connector-configs.schema";

export const providerAuthTypeEnum = pgEnum("provider_auth_type", ["oauth2", "api_key", "basic"]);

export const providers = pgTable("providers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  authType: providerAuthTypeEnum("auth_type").notNull().default("oauth2"),
  /**
   * JSON Schema to define the required configuration for this provider.
   * This will be used by the frontend to render the configuration form.
   */
  configSchema: jsonb("config_schema").notNull().default({}),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const providersRelations = relations(providers, ({ many }) => ({
  configs: many(connectorConfigs),
}));

export type ProviderDataTarget = typeof providers.$inferSelect;
