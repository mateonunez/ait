import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { providers } from "./providers.schema";

export const connectorConfigStatusEnum = pgEnum("connector_config_status", ["active", "error", "revoked", "pending"]);

export const connectorConfigs = pgTable("connector_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /**
   * The encrypted JSON configuration blob.
   */
  encryptedConfig: text("encrypted_config").notNull(),
  /**
   * Initialization Vector for decryption.
   */
  iv: text("iv").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  status: connectorConfigStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const connectorConfigsRelations = relations(connectorConfigs, ({ one }) => ({
  provider: one(providers, {
    fields: [connectorConfigs.providerId],
    references: [providers.id],
  }),
}));

export type ConnectorConfigDataTarget = typeof connectorConfigs.$inferSelect;
