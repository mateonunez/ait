import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { connectorConfigs } from "./connector-configs.schema";

export const googleGmailMessages = pgTable(
  "google_gmail_messages",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    threadId: varchar("thread_id", { length: 255 }).notNull(),
    connectorConfigId: varchar("connector_config_id", { length: 255 })
      .notNull()
      .references(() => connectorConfigs.id, { onDelete: "cascade" }),
    historyId: varchar("history_id", { length: 255 }),
    snippet: text("snippet"),
    internalDate: varchar("internal_date", { length: 255 }),
    labelIds: jsonb("label_ids").$type<string[]>(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),

    // Derived fields for easy access
    subject: text("subject"),
    from: text("from"),
    to: text("to"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    connectorConfigIdIdx: index("google_gmail_messages_connector_config_id_idx").on(t.connectorConfigId),
    threadIdIdx: index("google_gmail_messages_thread_id_idx").on(t.threadId),
    internalDateIdx: index("google_gmail_messages_internal_date_idx").on(t.internalDate),
  }),
);

export type GoogleGmailMessageDataTarget = InferSelectModel<typeof googleGmailMessages>;
export type GoogleGmailMessageInsert = InferInsertModel<typeof googleGmailMessages>;
