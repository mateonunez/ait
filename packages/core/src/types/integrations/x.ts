import type { components as XComponents } from "../openapi/openapi.x.types";

export interface BaseXEntity {
  __type: "tweet";
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
  jsonData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  __type: "tweet";
}

type XTweet = XComponents["schemas"]["Tweet"];

export interface XTweetExternal extends Omit<XTweet, "__type">, BaseXEntity {
  username?: string;
  name?: string;
  __type: "tweet";
}

export type XEntity = XTweetEntity;
export type XExternal = XTweetExternal;
