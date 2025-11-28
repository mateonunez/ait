import type { GoogleYouTubeSubscriptionEntity, PaginatedResponse, PaginationParams } from "@ait/core";
import type { IConnectorGoogleYouTubeSubscriptionRepository } from "../../../../types/domain/entities/vendors/connector.google.types";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import { getPostgresClient, googleSubscriptions, drizzleOrm } from "@ait/postgres";
import { connectorGoogleYouTubeSubscriptionMapper } from "../../../mappers/vendors/connector.google-youtube.mapper";

export class ConnectorGoogleYouTubeSubscriptionRepository implements IConnectorGoogleYouTubeSubscriptionRepository {
  private _pgClient = getPostgresClient();

  async saveSubscription(
    entity: Partial<GoogleYouTubeSubscriptionEntity>,
    options?: IConnectorRepositorySaveOptions,
  ): Promise<void> {
    const data = connectorGoogleYouTubeSubscriptionMapper.domainToDataTarget(entity);

    await this._pgClient.db.insert(googleSubscriptions).values(data).onConflictDoUpdate({
      target: googleSubscriptions.id,
      set: data,
    });
  }

  async saveSubscriptions(entities: Partial<GoogleYouTubeSubscriptionEntity>[]): Promise<void> {
    if (entities.length === 0) return;
    const data = entities.map((e) => connectorGoogleYouTubeSubscriptionMapper.domainToDataTarget(e));

    await this._pgClient.db
      .insert(googleSubscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: googleSubscriptions.id,
        set: {
          title: drizzleOrm.sql`excluded.title`,
          description: drizzleOrm.sql`excluded.description`,
          thumbnailUrl: drizzleOrm.sql`excluded.thumbnail_url`,
          totalItemCount: drizzleOrm.sql`excluded.total_item_count`,
          newItemCount: drizzleOrm.sql`excluded.new_item_count`,
          activityType: drizzleOrm.sql`excluded.activity_type`,
          updatedAt: new Date(),
        },
      });
  }

  async getSubscription(id: string): Promise<GoogleYouTubeSubscriptionEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(googleSubscriptions)
      .where(drizzleOrm.eq(googleSubscriptions.id, id))
      .limit(1);

    if (result.length === 0) return null;
    return connectorGoogleYouTubeSubscriptionMapper.dataTargetToDomain(result[0]!);
  }

  async fetchSubscriptions(): Promise<GoogleYouTubeSubscriptionEntity[]> {
    const results = await this._pgClient.db
      .select()
      .from(googleSubscriptions)
      .orderBy(drizzleOrm.desc(googleSubscriptions.publishedAt));
    return results.map((r) => connectorGoogleYouTubeSubscriptionMapper.dataTargetToDomain(r));
  }

  async getSubscriptionsPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResponse<GoogleYouTubeSubscriptionEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [results, countResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleSubscriptions)
        .orderBy(drizzleOrm.desc(googleSubscriptions.publishedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleSubscriptions),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      data: results.map((r) => connectorGoogleYouTubeSubscriptionMapper.dataTargetToDomain(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
