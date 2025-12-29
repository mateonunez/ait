import { GoogleYouTubeSubscriptionEntity, type PaginatedResponse, type PaginationParams } from "@ait/core";
import {
  type GoogleSubscriptionDataTargetInsert,
  drizzleOrm,
  getPostgresClient,
  googleSubscriptions,
} from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleYouTubeSubscriptionRepository } from "../../../../types/domain/entities/vendors/connector.google.types";

export class ConnectorGoogleYouTubeSubscriptionRepository implements IConnectorGoogleYouTubeSubscriptionRepository {
  private _pgClient = getPostgresClient();

  async saveSubscription(
    entity: GoogleYouTubeSubscriptionEntity,
    options?: IConnectorRepositorySaveOptions,
  ): Promise<void> {
    const data = entity.toPlain<GoogleSubscriptionDataTargetInsert>();

    await this._pgClient.db
      .insert(googleSubscriptions)
      .values(data as any)
      .onConflictDoUpdate({
        target: googleSubscriptions.id,
        set: data as any,
      });
  }

  async saveSubscriptions(entities: GoogleYouTubeSubscriptionEntity[]): Promise<void> {
    if (entities.length === 0) return;
    const data = entities.map((e) => e.toPlain<GoogleSubscriptionDataTargetInsert>());

    await this._pgClient.db
      .insert(googleSubscriptions)
      .values(data as any)
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
    return GoogleYouTubeSubscriptionEntity.fromPlain(result[0]! as GoogleSubscriptionDataTargetInsert);
  }

  async fetchSubscriptions(): Promise<GoogleYouTubeSubscriptionEntity[]> {
    const results = await this._pgClient.db
      .select()
      .from(googleSubscriptions)
      .orderBy(drizzleOrm.desc(googleSubscriptions.publishedAt));
    return results.map((r) => GoogleYouTubeSubscriptionEntity.fromPlain(r as GoogleSubscriptionDataTargetInsert));
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
      data: results.map((r) => GoogleYouTubeSubscriptionEntity.fromPlain(r as GoogleSubscriptionDataTargetInsert)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
