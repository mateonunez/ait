import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams, SlackMessageEntity, getLogger } from "@ait/core";
import { type SlackMessageDataTarget, drizzleOrm, getPostgresClient, slackMessages } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSlackMessageRepository } from "../../../../types/domain/entities/vendors/connector.slack.types";

const logger = getLogger();

export class ConnectorSlackMessageRepository implements IConnectorSlackMessageRepository {
  private _pgClient = getPostgresClient();

  async saveMessage(
    message: SlackMessageEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const messageId = incremental ? randomUUID() : message.id;

    try {
      const messageDataTarget = message.toPlain<SlackMessageDataTarget>();
      messageDataTarget.id = messageId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SlackMessageDataTarget> = {
          channelId: messageDataTarget.channelId,
          channelName: messageDataTarget.channelName,
          text: messageDataTarget.text,
          userId: messageDataTarget.userId,
          userName: messageDataTarget.userName,
          threadTs: messageDataTarget.threadTs,
          replyCount: messageDataTarget.replyCount,
          ts: messageDataTarget.ts,
          updatedAt: new Date(),
        };

        await tx
          .insert(slackMessages)
          .values(messageDataTarget as any)
          .onConflictDoUpdate({
            target: slackMessages.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save message:", { messageId, error });
      throw new AItError(
        "SLACK_SAVE_MESSAGE",
        `Failed to save message ${messageId}: ${error.message}`,
        { id: messageId },
        error,
      );
    }
  }

  async saveMessages(messages: SlackMessageEntity[]): Promise<void> {
    if (!messages.length) {
      return;
    }

    try {
      for (const message of messages) {
        await this.saveMessage(message, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving messages:", { error });
      throw new AItError("SLACK_SAVE_MESSAGE_BULK", "Failed to save messages to repository");
    }
  }

  async getMessage(id: string): Promise<SlackMessageEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(slackMessages)
      .where(drizzleOrm.eq(slackMessages.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return SlackMessageEntity.fromPlain(result[0]! as SlackMessageDataTarget);
  }

  async fetchMessages(): Promise<SlackMessageEntity[]> {
    const results = await this._pgClient.db.select().from(slackMessages);
    return results.map((result) => SlackMessageEntity.fromPlain(result as SlackMessageDataTarget));
  }

  async getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<SlackMessageEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [messages, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(slackMessages)
        .orderBy(drizzleOrm.desc(slackMessages.updatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(slackMessages),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.map((message) => SlackMessageEntity.fromPlain(message as SlackMessageDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
