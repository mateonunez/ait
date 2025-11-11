import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const xTweets = pgTable("x_tweets", {
  id: varchar("id", { length: 255 }).primaryKey(),
  text: text("text").notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorUsername: varchar("author_username", { length: 255 }),
  authorName: varchar("author_name", { length: 255 }),
  lang: varchar("lang", { length: 10 }),
  retweetCount: integer("retweet_count"),
  likeCount: integer("like_count"),
  replyCount: integer("reply_count"),
  quoteCount: integer("quote_count"),
  jsonData: jsonb("json_data").$type<Record<string, unknown>>(), // For raw API response storage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type XTweetDataTarget = typeof xTweets.$inferInsert;
