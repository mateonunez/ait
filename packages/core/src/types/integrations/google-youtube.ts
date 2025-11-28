import { z } from "zod";

// --- External Types (from YouTube Data API) ---

export interface GoogleYouTubeSubscriptionExternal {
  __type: "subscription";
  kind: "youtube#subscription";
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelTitle: string;
    title: string;
    description: string;
    resourceId: {
      kind: string;
      channelId: string;
    };
    channelId: string;
    thumbnails: {
      default: { url: string; width?: number; height?: number };
      medium: { url: string; width?: number; height?: number };
      high: { url: string; width?: number; height?: number };
    };
  };
  contentDetails: {
    totalItemCount: number;
    newItemCount: number;
    activityType: string;
  };
}

// --- Zod Schemas for validation ---

export const GoogleYouTubeSubscriptionSchema = z
  .object({
    kind: z.literal("youtube#subscription"),
    etag: z.string(),
    id: z.string(),
    snippet: z.object({
      publishedAt: z.string(),
      channelTitle: z.string(),
      title: z.string(),
      description: z.string(),
      resourceId: z.object({
        kind: z.string(),
        channelId: z.string(),
      }),
      channelId: z.string(),
      thumbnails: z.object({
        default: z.object({ url: z.string(), width: z.number().optional(), height: z.number().optional() }),
        medium: z.object({ url: z.string(), width: z.number().optional(), height: z.number().optional() }),
        high: z.object({ url: z.string(), width: z.number().optional(), height: z.number().optional() }),
      }),
    }),
    contentDetails: z.object({
      totalItemCount: z.number(),
      newItemCount: z.number(),
      activityType: z.string(),
    }),
  })
  .passthrough();

// --- Domain Types (normalized for app use) ---

export const GoogleYouTubeSubscriptionEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  channelId: z.string(),
  resourceChannelId: z.string(),
  publishedAt: z.string(),
  thumbnailUrl: z.string().nullable(),
  totalItemCount: z.number(),
  newItemCount: z.number(),
  activityType: z.string().nullable(),
  __type: z.literal("subscription"),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type GoogleYouTubeSubscriptionEntity = z.infer<typeof GoogleYouTubeSubscriptionEntitySchema>;
