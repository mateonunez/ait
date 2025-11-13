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

export interface XTweetEntity {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string | null;
  authorName: string | null;
  lang?: string;
  retweetCount?: number;
  likeCount?: number;
  replyCount?: number;
  quoteCount?: number;
  conversationId?: string | null;
  inReplyToUserId?: string | null;
  mediaAttachments?: XMediaEntity[] | null;
  pollData?: XPollEntity | null;
  placeData?: XPlaceEntity | null;
  jsonData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  __type: "tweet";
}

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
