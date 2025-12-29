import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams, XTweetEntity, getLogger } from "@ait/core";
import {
  type OAuthTokenDataTarget,
  type XTweetDataTarget,
  drizzleOrm,
  getPostgresClient,
  xTweets,
} from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorXRepository,
  IConnectorXTweetRepository,
} from "../../../../types/domain/entities/vendors/connector.x.repository.types";

const logger = getLogger();

export class ConnectorXTweetRepository implements IConnectorXTweetRepository {
  private _pgClient = getPostgresClient();

  async saveTweet(tweet: XTweetEntity, options?: IConnectorRepositorySaveOptions): Promise<void> {
    const { incremental } = options ?? { incremental: false };
    const tweetId = incremental ? randomUUID() : tweet.id;

    try {
      const tweetData = tweet.toPlain<XTweetDataTarget>();
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
          .values(tweetData as any)
          .onConflictDoUpdate({
            target: xTweets.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save tweet:", { tweetId, error });
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
    const result = await this._pgClient.db.select().from(xTweets).where(drizzleOrm.eq(xTweets.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return XTweetEntity.fromPlain(result[0]! as XTweetDataTarget);
  }

  async fetchTweets(): Promise<XTweetEntity[]> {
    const results = await this._pgClient.db.select().from(xTweets);
    return results.map((result) => XTweetEntity.fromPlain(result as XTweetDataTarget));
  }

  async getTweetsPaginated(params: PaginationParams): Promise<PaginatedResponse<XTweetEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [tweets, totalResult] = await Promise.all([
      this._pgClient.db.select().from(xTweets).orderBy(drizzleOrm.desc(xTweets.createdAt)).limit(limit).offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(xTweets),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: tweets.map((tweet) => XTweetEntity.fromPlain(tweet as XTweetDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
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
