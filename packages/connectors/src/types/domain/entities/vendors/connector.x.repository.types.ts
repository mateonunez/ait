import type { components as XComponents } from "@/types/openapi/openapi.x.types";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorXTweetRepository {
  saveTweet(tweet: Partial<XTweetEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveTweets(tweets: Partial<XTweetEntity>[]): Promise<void>;
  getTweet(id: string): Promise<XTweetEntity | null>;
  getTweets(): Promise<XTweetEntity[]>;
}

export interface IConnectorXRepository extends IConnectorRepository {
  tweet: IConnectorXTweetRepository;
}

export interface BaseXEntity {
  __type: "tweet";
}

type XTweet = XComponents["schemas"]["Tweet"];

export interface XTweetExternal extends Omit<XTweet, "__type">, BaseXEntity {
  __type: "tweet";
}

export interface XTweetEntity {
  id: string;
  text: string;
  authorId: string;
  lang?: string;
  retweetCount?: number;
  likeCount?: number;
  jsonData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  __type: "tweet";
}

export type XEntity = XTweetEntity;
export type XExternal = XTweetExternal;
