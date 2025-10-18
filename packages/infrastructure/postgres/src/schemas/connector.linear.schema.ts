import { pgTable, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";

export const linearIssues = pgTable("linear_issues", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  state: varchar("state", { length: 100 }).notNull(),
  priority: integer("priority"),
  assigneeId: varchar("assignee_id", { length: 255 }),
  teamId: varchar("team_id", { length: 255 }).notNull(),
  projectId: varchar("project_id", { length: 255 }),
  url: varchar("url", { length: 512 }).notNull(),
  labels: text("labels").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type LinearIssueDataTarget = typeof linearIssues.$inferInsert;
