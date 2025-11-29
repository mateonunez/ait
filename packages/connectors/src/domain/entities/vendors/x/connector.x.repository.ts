import { AItError, type XTweetEntity, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { connectorXTweetMapper } from "../../../mappers/vendors/connector.x.mapper";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData, clearOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorXRepository,
  IConnectorXTweetRepository,
} from "../../../../types/domain/entities/vendors/connector.x.repository.types";
import {
  getPostgresClient,
  type OAuthTokenDataTarget,
  type XTweetDataTarget,
  xTweets,
  drizzleOrm,
} from "@ait/postgres";
import { randomUUID } from "node:crypto";

const logger = getLogger();

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
    logger.debug("Getting tweet from X repository", { id });
    return null;
  }

  async fetchTweets(): Promise<XTweetEntity[]> {
    logger.debug("Getting tweets from X repository");
    return [];
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
      data: tweets.map((tweet) => connectorXTweetMapper.dataTargetToDomain(tweet)),
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
