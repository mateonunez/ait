import { connectorXTweetMapper } from "../../../domain/mappers/vendors/connector.x.mapper";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData } from "../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorRepositorySaveOptions } from "../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorXRepository,
  IConnectorXTweetRepository,
  XTweetEntity,
} from "../../../types/domain/entities/vendors/connector.x.repository.types";
import { getPostgresClient, type OAuthTokenDataTarget, xTweets } from "@ait/postgres";
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
        await tx
          .insert(xTweets)
          .values(tweetData)
          .onConflictDoUpdate({
            target: xTweets.id,
            set: {
              text: tweetData.text,
              authorId: tweetData.authorId,
              lang: tweetData.lang,
              retweetCount: tweetData.retweetCount,
              likeCount: tweetData.likeCount,
              jsonData: tweetData.jsonData,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save tweet:", { tweetId, error });
      throw new Error(`Failed to save tweet ${tweetId}: ${error.message}`);
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
    saveOAuthData(data, "x");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("x");
  }

  get tweet(): ConnectorXTweetRepository {
    return this._connectorXTweetRepository;
  }

  set tweet(tweet: ConnectorXTweetRepository) {
    this._connectorXTweetRepository = tweet;
  }
}
