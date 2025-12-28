import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const googleContacts = pgTable("google_contacts", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  givenName: text("given_name"),
  familyName: text("family_name"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  organization: text("organization"),
  jobTitle: text("job_title"),
  photoUrl: text("photo_url"),
  biography: text("biography"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type GoogleContactDataTarget = typeof googleContacts.$inferSelect;
export type GoogleContactDataTargetInsert = typeof googleContacts.$inferInsert;
