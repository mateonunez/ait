import {
  AItError,
  GmailMessageEntity,
  type GmailMessageExternal,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
  mapGmailMessage,
} from "@ait/core";
import {
  type GoogleGmailMessageDataTarget,
  type GoogleGmailMessageInsert,
  drizzleOrm,
  getPostgresClient,
  googleGmailMessages,
} from "@ait/postgres";
import { instanceToPlain, plainToInstance } from "class-transformer";
import type { IConnectorGoogleGmailRepository } from "../../../../types/domain/entities/vendors/connector.google.gmail.types";

const { sql } = drizzleOrm;

export class ConnectorGoogleGmailRepository implements IConnectorGoogleGmailRepository {
  private _logger = getLogger();
  private _pgClient = getPostgresClient();

  async save(data: GmailMessageExternal, connectorConfigId: string): Promise<void> {
    await this.saveMessages([data], connectorConfigId);
  }

  async saveMessages(data: GmailMessageExternal[], connectorConfigId: string): Promise<void> {
    if (data.length === 0) return;

    try {
      const values: GoogleGmailMessageInsert[] = data.map((msg) => {
        const entity = mapGmailMessage(msg);
        const plain = instanceToPlain(entity) as Record<string, unknown>;

        return {
          id: plain.id as string,
          threadId: plain.threadId as string,
          connectorConfigId: connectorConfigId,
          historyId: plain.historyId as string | undefined,
          snippet: plain.snippet as string | undefined,
          internalDate: plain.internalDate as string | undefined,
          labelIds: plain.labelIds as string[] | undefined,

          subject: plain.subject as string | undefined,
          from: plain.from as string | undefined,
          to: plain.to as string | undefined,

          payload: { bodySnippet: plain.bodySnippet },

          metadata: plain.metadata as Record<string, unknown> | undefined,
          createdAt: entity.createdAt,
          updatedAt: new Date(),
        };
      });

      await this._pgClient.db
        .insert(googleGmailMessages)
        .values(values)
        .onConflictDoUpdate({
          target: googleGmailMessages.id,
          set: {
            historyId: sql`EXCLUDED.history_id`,
            snippet: sql`EXCLUDED.snippet`,
            internalDate: sql`EXCLUDED.internal_date`,
            labelIds: sql`EXCLUDED.label_ids`,
            payload: sql`EXCLUDED.payload`,
            subject: sql`EXCLUDED.subject`,
            from: sql`EXCLUDED.from`,
            to: sql`EXCLUDED.to`,
            metadata: sql`EXCLUDED.metadata`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
    } catch (error) {
      this._logger.error("Failed to save Gmail messages", { error });
      throw new AItError("GMAIL_SAVE_MESSAGES", "Failed to save Gmail messages", { count: data.length }, error);
    }
  }

  async saveEntities(data: GmailMessageEntity[], connectorConfigId: string): Promise<void> {
    if (data.length === 0) return;

    try {
      const values: GoogleGmailMessageInsert[] = data.map((entity) => {
        const plain = instanceToPlain(entity) as Record<string, unknown>;

        return {
          id: plain.id as string,
          threadId: plain.threadId as string,
          connectorConfigId: connectorConfigId,
          historyId: plain.historyId as string | undefined,
          snippet: plain.snippet as string | undefined,
          internalDate: plain.internalDate as string | undefined,
          labelIds: plain.labelIds as string[] | undefined,

          subject: plain.subject as string | undefined,
          from: plain.from as string | undefined,
          to: plain.to as string | undefined,

          payload: { bodySnippet: plain.bodySnippet },

          metadata: plain.metadata as Record<string, unknown> | undefined,
          createdAt: entity.createdAt,
          updatedAt: new Date(),
        };
      });

      await this._pgClient.db
        .insert(googleGmailMessages)
        .values(values)
        .onConflictDoUpdate({
          target: googleGmailMessages.id,
          set: {
            historyId: sql`EXCLUDED.history_id`,
            snippet: sql`EXCLUDED.snippet`,
            internalDate: sql`EXCLUDED.internal_date`,
            labelIds: sql`EXCLUDED.label_ids`,
            payload: sql`EXCLUDED.payload`,
            subject: sql`EXCLUDED.subject`,
            from: sql`EXCLUDED.from`,
            to: sql`EXCLUDED.to`,
            metadata: sql`EXCLUDED.metadata`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
    } catch (error) {
      this._logger.error("Failed to save Gmail message entities", { error });
      throw new AItError("GMAIL_SAVE_ENTITIES", "Failed to save Gmail message entities", { count: data.length }, error);
    }
  }

  async getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<GmailMessageEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [data, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleGmailMessages)
        .limit(limit)
        .offset(offset)
        .orderBy(drizzleOrm.desc(googleGmailMessages.internalDate)),
      this._pgClient.db.select({ count: sql<number>`count(*)` }).from(googleGmailMessages),
    ]);

    const items = data.map((row) => {
      const typedRow = row as GoogleGmailMessageDataTarget;
      // Manually map back to entity structure that matches plain object
      const plain = {
        ...typedRow,
        // Map payload.bodySnippet back to root bodySnippet
        bodySnippet: (typedRow.payload as { bodySnippet?: string })?.bodySnippet ?? null,
        __type: "gmail_message",
      };

      return plainToInstance(GmailMessageEntity, plain, { exposeDefaultValues: true });
    });

    return buildPaginatedResponse(items, params, Number(totalResult[0]?.count || 0));
  }
}
