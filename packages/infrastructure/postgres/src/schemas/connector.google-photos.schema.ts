import type { GooglePhotoContributorInfo, GooglePhotoMediaMetadata } from "@ait/core";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const googlePhotos = pgTable("google_photos", {
  id: text("id").primaryKey(),
  description: text("description"),
  productUrl: text("product_url").notNull(),
  baseUrl: text("base_url").notNull(),
  mimeType: text("mime_type").notNull(),
  mediaMetadata: jsonb("media_metadata").$type<GooglePhotoMediaMetadata>().notNull(),
  contributorInfo: jsonb("contributor_info").$type<GooglePhotoContributorInfo>(),
  filename: text("filename").notNull(),
  creationTime: timestamp("creation_time", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  localPath: text("local_path"),
});

export type GooglePhotoDataTarget = typeof googlePhotos.$inferSelect;
export type GooglePhotoDataInsert = typeof googlePhotos.$inferInsert;
