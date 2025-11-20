import type { SlackMessageEntity } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { safeString } from "./formatter.utils";
import { TextNormalizationService } from "../../metadata/text-normalization.service";

const textNormalizer = new TextNormalizationService();

export const SlackMessageFormatter: EntityFormatter<SlackMessageEntity> = {
  format: (meta) => {
    const text = safeString(meta.text, "");
    const channelName = safeString(meta.channelName);
    const userName = safeString(meta.userName);
    const threadTs = safeString(meta.threadTs);

    const parts: string[] = [];
    if (channelName) {
      parts.push(`Slack message in #${channelName}`);
    } else {
      parts.push("Slack message");
    }
    if (userName) {
      parts.push(` from ${userName}`);
    }
    if (threadTs) {
      parts.push(" [thread reply]");
    }
    if (text) {
      parts.push(`: ${textNormalizer.truncate(text, 200)}`);
    }

    return parts.join("");
  },
};
