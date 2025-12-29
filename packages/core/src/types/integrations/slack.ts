import { z } from "zod";

export interface BaseSlackEntityType {
  __type: "slack_message";
}

/**
 * Generic Slack API response wrapper
 */
export interface SlackApiResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Slack user information
 */
export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    email?: string;
  };
  is_bot?: boolean;
  deleted?: boolean;
}

/**
 * Slack conversation/channel information
 */
export interface SlackConversation {
  id: string;
  name: string;
  is_archived: boolean;
  is_private: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_member?: boolean;
}

export interface SlackFile {
  id: string;
  name: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
  thumb_64?: string;
  thumb_80?: string;
  thumb_160?: string;
  thumb_360?: string;
  thumb_480?: string;
  thumb_720?: string;
  thumb_800?: string;
  thumb_960?: string;
  thumb_1024?: string;
  thumb_tiny?: string;
  original_w?: number;
  original_h?: number;
  permalink?: string;
  permalink_public?: string;
}

export interface SlackAttachment {
  id?: number;
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{ title?: string; value?: string; short?: boolean }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  from_url?: string;
}

export interface SlackReaction {
  name: string;
  count: number;
  users?: string[];
}

const SlackFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  mimetype: z.string().optional(),
  filetype: z.string().optional(),
  size: z.number().optional(),
  url_private: z.string().optional(),
  url_private_download: z.string().optional(),
  thumb_64: z.string().optional(),
  thumb_80: z.string().optional(),
  thumb_160: z.string().optional(),
  thumb_360: z.string().optional(),
  thumb_480: z.string().optional(),
  thumb_720: z.string().optional(),
  thumb_800: z.string().optional(),
  thumb_960: z.string().optional(),
  thumb_1024: z.string().optional(),
  thumb_tiny: z.string().optional(),
  original_w: z.number().optional(),
  original_h: z.number().optional(),
  permalink: z.string().optional(),
  permalink_public: z.string().optional(),
});

const SlackAttachmentSchema = z.object({
  id: z.number().optional(),
  color: z.string().optional(),
  fallback: z.string().optional(),
  title: z.string().optional(),
  title_link: z.string().optional(),
  text: z.string().optional(),
  fields: z
    .array(
      z.object({
        title: z.string().optional(),
        value: z.string().optional(),
        short: z.boolean().optional(),
      }),
    )
    .optional(),
  image_url: z.string().optional(),
  thumb_url: z.string().optional(),
  footer: z.string().optional(),
  footer_icon: z.string().optional(),
  ts: z.number().optional(),
  from_url: z.string().optional(),
});

const SlackReactionSchema = z.object({
  name: z.string(),
  count: z.number(),
  users: z.array(z.string()).optional(),
});

export const SlackMessageEntityTypeSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  channelName: z.string(),
  text: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  threadTs: z.string().nullable(),
  replyCount: z.number(),
  permalink: z.string().nullable(),
  files: z.array(SlackFileSchema),
  attachments: z.array(SlackAttachmentSchema),
  reactions: z.array(SlackReactionSchema),
  edited: z
    .object({
      user: z.string().optional(),
      ts: z.string().optional(),
    })
    .nullable(),
  pinnedTo: z.array(z.string()),
  ts: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("slack_message"),
});

export type SlackMessageEntityType = z.infer<typeof SlackMessageEntityTypeSchema>;

/**
 * External Slack message representation from the API
 * This matches the Slack API response structure with optional enrichment fields
 */
export interface SlackMessageExternal extends BaseSlackEntityType {
  ts: string;
  channel?: string; // Added during enrichment
  channelName?: string; // Added during enrichment
  user?: string;
  userName?: string | null; // Added during enrichment
  bot_id?: string; // From raw API - used for filtering
  text: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number; // From raw API
  subtype?: string; // From raw API - used for filtering system messages
  type?: string; // From raw API
  permalink?: string; // Added during enrichment
  files?: SlackFile[];
  attachments?: SlackAttachment[];
  reactions?: SlackReaction[];
  edited?: { user?: string; ts?: string };
  pinned_to?: string[];
  __type: "slack_message";
}

export type SlackEntityType = SlackMessageEntityType;
export type SlackExternal = SlackMessageExternal;
