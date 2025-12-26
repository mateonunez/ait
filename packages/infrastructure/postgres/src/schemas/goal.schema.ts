import { randomUUID } from "node:crypto";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const goals = pgTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // GoalType
  target: integer("target").notNull(),
  period: text("period").notNull(), // GoalPeriod
  current: integer("current").default(0).notNull(),
  progress: integer("progress").default(0).notNull(), // 0-100
  streak: integer("streak").default(0).notNull(),
  label: text("label"),
  icon: text("icon"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GoalInsert = typeof goals.$inferInsert;
export type GoalSelect = typeof goals.$inferSelect;
