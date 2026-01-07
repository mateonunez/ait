import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const slackMessages = pgTable(
  "slack_messages",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    channelId: varchar("channel_id", { length: 255 }).notNull(),
    channelName: varchar("channel_name", { length: 255 }).notNull(),
    text: text("text").notNull(),
    userId: varchar("user_id", { length: 255 }),
    userName: varchar("user_name", { length: 255 }),
    threadTs: varchar("thread_ts", { length: 255 }),
    replyCount: integer("reply_count").default(0).notNull(),
    permalink: text("permalink"),
    files: jsonb("files").$type<Array<Record<string, unknown>>>().default([]),
    attachments: jsonb("attachments").$type<Array<Record<string, unknown>>>().default([]),
    reactions: jsonb("reactions").$type<Array<Record<string, unknown>>>().default([]),
    edited: jsonb("edited").$type<{ user?: string; ts?: string } | null>(),
    pinnedTo: jsonb("pinned_to").$type<string[]>().default([]),
    ts: varchar("ts", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      channelIdx: index("slack_messages_channel_idx").on(table.channelId),
      threadIdx: index("slack_messages_thread_idx").on(table.threadTs),
      userIdx: index("slack_messages_user_idx").on(table.userId),
      tsIdx: index("slack_messages_ts_idx").on(table.ts),
      updatedAtIdIdx: index("slack_messages_updated_at_id_idx").on(table.updatedAt, table.id),
    };
  },
);

export type SlackMessageDataTarget = typeof slackMessages.$inferInsert;
