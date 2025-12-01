import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const googleSubscriptions = pgTable("youtube_subscriptions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  channelId: text("channel_id").notNull(),
  resourceChannelId: text("resource_channel_id").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  totalItemCount: integer("total_item_count").default(0).notNull(),
  newItemCount: integer("new_item_count").default(0).notNull(),
  activityType: text("activity_type"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type GoogleSubscriptionDataTarget = typeof googleSubscriptions.$inferSelect;
export type GoogleSubscriptionDataTargetInsert = typeof googleSubscriptions.$inferInsert;
