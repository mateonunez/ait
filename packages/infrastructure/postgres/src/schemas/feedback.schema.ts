import { randomUUID } from "node:crypto";
import { jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { messages } from "./chat.schema";

export const feedbackRatingEnum = pgEnum("feedback_rating", ["thumbs_up", "thumbs_down", "neutral"]);

export const feedback = pgTable("feedback", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  messageId: text("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  traceId: text("trace_id"),
  rating: feedbackRatingEnum("rating").notNull(),
  comment: text("comment"),
  userId: text("user_id"),
  sessionId: text("session_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FeedbackInsert = typeof feedback.$inferInsert;
export type FeedbackSelect = typeof feedback.$inferSelect;
