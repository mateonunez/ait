import type { SlackMessageDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";

export class ETLSlackMessageDescriptor implements IETLEmbeddingDescriptor<SlackMessageDataTarget> {
  public getEmbeddingText(message: SlackMessageDataTarget): string {
    const parts: string[] = [];

    // Channel name provides context
    if (message.channelName) {
      const sanitizedChannel = TextSanitizer.sanitize(message.channelName);
      parts.push(`Channel: ${sanitizedChannel}`);
    }

    // Message text is the main content
    if (message.text) {
      const sanitizedText = TextSanitizer.sanitize(message.text);
      // Limit text length to avoid overwhelming the embedding
      const textPreview = sanitizedText.length > 500 ? `${sanitizedText.slice(0, 500)}...` : sanitizedText;
      parts.push(textPreview);
    }

    // Add user context if available
    if (message.userName) {
      const sanitizedUser = TextSanitizer.sanitize(message.userName);
      parts.push(`by ${sanitizedUser}`);
    }

    // Add thread context if message is threaded
    if (message.threadTs) {
      parts.push("thread reply");
    }

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SlackMessageDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      channelName: entityWithoutInternalTimestamps.channelName
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.channelName, 255)
        : null,
      text: entityWithoutInternalTimestamps.text
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.text, 2000)
        : null,
      userName: entityWithoutInternalTimestamps.userName
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.userName, 255)
        : null,
    };

    return {
      __type: "message",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const slackDescriptorsETL = {
  message: new ETLSlackMessageDescriptor(),
};
