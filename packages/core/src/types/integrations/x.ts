import { z } from "zod";
import type { components as XComponents } from "../openapi/openapi.x.types";

export interface BaseXEntity {
  __type: "tweet";
}

// Media entity for photos, videos, GIFs
export interface XMediaEntity {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  alt_text?: string;
}

// Poll entity for tweet polls
export interface XPollEntity {
  id: string;
  options: Array<{
    position: number;
    label: string;
    votes: number;
  }>;
  duration_minutes: number;
  end_datetime: string;
  voting_status: "open" | "closed";
}

// Place entity for location data
export interface XPlaceEntity {
  id: string;
  name: string;
  full_name: string;
  country?: string;
  country_code?: string;
  place_type?: string;
  geo?: {
    type: string;
    bbox?: number[];
    geometry?: {
      type: string;
      coordinates: number[];
    };
  };
}

// Includes container for expanded API response data
export interface XTweetIncludes {
  media?: XMediaEntity[];
  polls?: XPollEntity[];
  places?: XPlaceEntity[];
  users?: Array<{
    id: string;
    username: string;
    name: string;
  }>;
  tweets?: Array<Record<string, unknown>>;
}

const XMediaEntitySchema = z.object({
  media_key: z.string(),
  type: z.enum(["photo", "video", "animated_gif"]),
  url: z.string().optional(),
  preview_image_url: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration_ms: z.number().optional(),
  alt_text: z.string().optional(),
});

const XPollEntitySchema = z.object({
  id: z.string(),
  options: z.array(
    z.object({
      position: z.number(),
      label: z.string(),
      votes: z.number(),
    }),
  ),
  duration_minutes: z.number(),
  end_datetime: z.string(),
  voting_status: z.enum(["open", "closed"]),
});

const XPlaceEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  full_name: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  place_type: z.string().optional(),
  geo: z
    .object({
      type: z.string(),
      bbox: z.array(z.number()).optional(),
      geometry: z
        .object({
          type: z.string(),
          coordinates: z.array(z.number()),
        })
        .optional(),
    })
    .optional(),
});

export const XTweetEntitySchema = z.object({
  id: z.string(),
  text: z.string(),
  authorId: z.string(),
  authorUsername: z.string().nullable(),
  authorName: z.string().nullable(),
  lang: z.string().optional(),
  retweetCount: z.number().optional(),
  likeCount: z.number().optional(),
  replyCount: z.number().optional(),
  quoteCount: z.number().optional(),
  conversationId: z.string().nullable().optional(),
  inReplyToUserId: z.string().nullable().optional(),
  mediaAttachments: z.array(XMediaEntitySchema).nullable().optional(),
  pollData: XPollEntitySchema.nullable().optional(),
  placeData: XPlaceEntitySchema.nullable().optional(),
  jsonData: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("tweet"),
});

export type XTweetEntity = z.infer<typeof XTweetEntitySchema>;

type XTweet = XComponents["schemas"]["Tweet"];

export interface XTweetExternal extends Omit<XTweet, "__type">, BaseXEntity {
  username?: string;
  name?: string;
  media?: XMediaEntity[];
  poll?: XPollEntity;
  place?: XPlaceEntity;
  __type: "tweet";
}

export type XEntity = XTweetEntity;
export type XExternal = XTweetExternal;
