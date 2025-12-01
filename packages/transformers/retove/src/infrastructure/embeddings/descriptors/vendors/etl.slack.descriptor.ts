import type { SlackMessageDataTarget } from "@ait/postgres";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLSlackMessageDescriptor implements IETLEmbeddingDescriptor<SlackMessageDataTarget> {
  public getEmbeddingText(message: SlackMessageDataTarget): string {
    const parts: string[] = [];

    // Message identity
    parts.push("Slack message");

    // Add user context if available
    if (message.userName) {
      const sanitizedUser = TextSanitizer.sanitize(message.userName);
      parts.push(`from ${sanitizedUser}`);
    }

    // Channel name provides context
    if (message.channelName) {
      const sanitizedChannel = TextSanitizer.sanitize(message.channelName);
      parts.push(`in #${sanitizedChannel}`);
    }

    // Message text is the main content
    if (message.text) {
      const sanitizedText = TextSanitizer.sanitize(message.text);
      const textPreview = sanitizedText.length > 500 ? `${sanitizedText.slice(0, 500)}...` : sanitizedText;
      parts.push(`"${textPreview}"`);
    }

    // Add thread context if message is threaded
    if (message.threadTs) {
      parts.push("(thread reply)");
    }

    // Add timestamp if available - ts is the Slack timestamp
    if (message.ts) {
      const date = new Date(Number(message.ts.split(".")[0]) * 1000);
      parts.push(`posted ${date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
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
