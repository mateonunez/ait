import { AItError, type SlackMessageEntity } from "@ait/core";
import { connectorSlackMessageMapper } from "../../../../domain/mappers/vendors/connector.slack.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSlackMessageRepository } from "../../../../types/domain/entities/vendors/connector.slack.types";
import { getPostgresClient, slackMessages, type SlackMessageDataTarget } from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorSlackMessageRepository implements IConnectorSlackMessageRepository {
  private _pgClient = getPostgresClient();

  async saveMessage(
    message: SlackMessageEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const messageId = incremental ? randomUUID() : message.id;

    try {
      const messageDataTarget = connectorSlackMessageMapper.domainToDataTarget(message);
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
          .values(messageDataTarget)
          .onConflictDoUpdate({
            target: slackMessages.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save message:", { messageId, error });
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
      console.debug("Saving messages to Slack repository:", { count: messages.length });

      for (const message of messages) {
        await this.saveMessage(message, { incremental: false });
      }
    } catch (error) {
      console.error("Error saving messages:", error);
      throw new AItError("SLACK_SAVE_MESSAGE_BULK", "Failed to save messages to repository");
    }
  }

  async getMessage(id: string): Promise<SlackMessageEntity | null> {
    console.log("Getting message from Slack repository", id);
    return null;
  }

  async getMessages(): Promise<SlackMessageEntity[]> {
    console.log("Getting messages from Slack repository");
    return [];
  }
}
