import type { PaginatedResponse, PaginationParams } from "@ait/core";
import type { XTweetEntity } from "../../../../domain/entities/x/x-tweet.entity";

import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorXTweetRepository {
  saveTweet(tweet: Partial<XTweetEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveTweets(tweets: Partial<XTweetEntity>[]): Promise<void>;
  getTweet(id: string): Promise<XTweetEntity | null>;
  fetchTweets(): Promise<XTweetEntity[]>;
  getTweetsPaginated(params: PaginationParams): Promise<PaginatedResponse<XTweetEntity>>;
}

export interface IConnectorXRepository extends IConnectorRepository {
  tweet: IConnectorXTweetRepository;
}
