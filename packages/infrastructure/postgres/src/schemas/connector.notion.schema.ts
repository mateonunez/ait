import { boolean, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const notionPages = pgTable("notion_pages", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  parentType: varchar("parent_type", { length: 100 }),
  parentId: varchar("parent_id", { length: 255 }),
  archived: boolean("archived").notNull().default(false),
  icon: text("icon"),
  cover: text("cover"),
  content: text("content"),
  properties: jsonb("properties"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 255 }),
  lastEditedBy: varchar("last_edited_by", { length: 255 }),
});

export type NotionPageDataTarget = typeof notionPages.$inferInsert;
