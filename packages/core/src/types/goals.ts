import { z } from "zod";
import type { EntityType } from "./entities";

export type GoalType =
  | EntityType
  | "songs" // Alias for "spotify_recently_played" (backward compatibility)
  | "tweets" // Alias for "x_tweet" (backward compatibility)
  | "commits" // Alias for "github_commit" (backward compatibility)
  | "tasks" // Alias for "linear_issue" (backward compatibility)
  | "documents" // Alias for "notion_page" (backward compatibility)
  | "messages" // Alias for "slack_message" (backward compatibility)
  | "meetings"; // Alias for "google_calendar_event" (backward compatibility)

export const GoalTypeSchema = z.enum([
  "spotify_track",
  "spotify_artist",
  "spotify_playlist",
  "spotify_album",
  "spotify_recently_played",
  "github_repository",
  "github_pull_request",
  "github_commit",
  "github_file",
  "linear_issue",
  "x_tweet",
  "notion_page",
  "slack_message",
  "google_calendar_event",
  "google_calendar_calendar",
  "google_youtube_subscription",
  "google_contact",
  "google_photo",
  "songs",
  "tweets",
  "commits",
  "tasks",
  "documents",
  "messages",
  "meetings",
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
