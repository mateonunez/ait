import { z } from "zod";
import type { EntityType } from "./entities";

export type GoalType =
  | EntityType
  | "songs" // Alias for "recently_played" (backward compatibility)
  | "tweets" // Alias for "tweet" (backward compatibility)
  | "commits" // Alias for "commit" (backward compatibility)
  | "tasks" // Alias for "issue" (backward compatibility)
  | "documents" // Alias for "page" (backward compatibility)
  | "messages" // Alias for "message" (backward compatibility)
  | "meetings"; // Alias for "event" (backward compatibility)

export const GoalTypeSchema = z.enum([
  "track",
  "artist",
  "playlist",
  "album",
  "recently_played",
  "repository",
  "pull_request",
  "commit",
  "repository_file",
  "issue",
  "tweet",
  "page",
  "message",
  "event",
  "calendar",
  "subscription",
  "google_contact",
  "songs",
  "tweets",
  "commits",
  "tasks",
  "documents",
  "messages",
  "meetings",
  "google_photo",
]);

export type GoalPeriod = "daily" | "weekly" | "monthly";

export const GoalPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

export interface GoalData {
  id: string;
  type: GoalType;
  target: number;
  period: GoalPeriod;
  current: number;
  progress: number; // 0-100
  streak: number;
  createdAt: string;
  updatedAt: string;
  label?: string;
  icon?: string;
}

export interface GoalSummary {
  total: number;
  completed: number;
  inProgress: number;
  averageProgress: number;
  longestStreak: number;
}

export const CreateGoalSchema = z.object({
  type: GoalTypeSchema,
  target: z.number().min(1),
  period: GoalPeriodSchema,
  label: z.string().optional(),
  icon: z.string().optional(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = z.object({
  target: z.number().min(1).optional(),
  period: GoalPeriodSchema.optional(),
  label: z.string().optional(),
  icon: z.string().optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalSchema>;
