export interface BaseSlackEntity {
  __type: "message";
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

export interface SlackMessageEntity extends BaseSlackEntity {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  userId: string | null;
  userName: string | null;
  threadTs: string | null;
  replyCount: number;
  permalink: string | null;
  files: SlackFile[];
  attachments: SlackAttachment[];
  reactions: SlackReaction[];
  edited: { user?: string; ts?: string } | null;
  pinnedTo: string[];
  ts: string;
  createdAt: Date;
  updatedAt: Date;
  __type: "message";
}

/**
 * External Slack message representation from the API
 * This matches the Slack API response structure with optional enrichment fields
 */
export interface SlackMessageExternal extends BaseSlackEntity {
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
  __type: "message";
}

export type SlackEntity = SlackMessageEntity;
export type SlackExternal = SlackMessageExternal;
