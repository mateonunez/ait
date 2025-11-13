import { AItError, type XTweetEntity } from "@ait/core";
import { connectorXTweetMapper } from "../../../mappers/vendors/connector.x.mapper";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData, clearOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorXRepository,
  IConnectorXTweetRepository,
} from "../../../../types/domain/entities/vendors/connector.x.repository.types";
import { getPostgresClient, type OAuthTokenDataTarget, type XTweetDataTarget, xTweets } from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorXTweetRepository implements IConnectorXTweetRepository {
  private _pgClient = getPostgresClient();

  async saveTweet(tweet: XTweetEntity, options?: IConnectorRepositorySaveOptions): Promise<void> {
    const { incremental } = options ?? { incremental: false };
    const tweetId = incremental ? randomUUID() : tweet.id;

    try {
      const tweetData = connectorXTweetMapper.domainToDataTarget(tweet);
      tweetData.id = tweetId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<XTweetDataTarget> = {
          text: tweetData.text,
          authorId: tweetData.authorId,
          lang: tweetData.lang,
          retweetCount: tweetData.retweetCount,
          likeCount: tweetData.likeCount,
          replyCount: tweetData.replyCount,
          quoteCount: tweetData.quoteCount,
          conversationId: tweetData.conversationId,
          inReplyToUserId: tweetData.inReplyToUserId,
          mediaAttachments: tweetData.mediaAttachments,
          pollData: tweetData.pollData,
          placeData: tweetData.placeData,
          jsonData: tweetData.jsonData,
          updatedAt: new Date(),
        };

        await tx
          .insert(xTweets)
          .values(tweetData)
          .onConflictDoUpdate({
            target: xTweets.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save tweet:", { tweetId, error });
      throw new AItError("X_SAVE_TWEET", `Failed to save tweet ${tweetId}: ${error.message}`, { id: tweetId }, error);
    }
  }

  async saveTweets(tweets: XTweetEntity[], options?: IConnectorRepositorySaveOptions): Promise<void> {
    if (!tweets.length) {
      return;
    }

    await Promise.all(tweets.map((tweet) => this.saveTweet(tweet, options)));
  }

  async getTweet(id: string): Promise<XTweetEntity | null> {
    console.log("Getting tweet from X repository", id);
    return null;
  }

  async getTweets(): Promise<XTweetEntity[]> {
    console.log("Getting tweets from X repository");
    return [];
  }
}

export class ConnectorXRepository extends ConnectorXTweetRepository implements IConnectorXRepository {
  private _connectorXTweetRepository: ConnectorXTweetRepository;

  constructor() {
    super();
    this._connectorXTweetRepository = new ConnectorXTweetRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "x");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("x");
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("x");
  }

  get tweet(): ConnectorXTweetRepository {
    return this._connectorXTweetRepository;
  }

  set tweet(tweet: ConnectorXTweetRepository) {
    this._connectorXTweetRepository = tweet;
  }
}
