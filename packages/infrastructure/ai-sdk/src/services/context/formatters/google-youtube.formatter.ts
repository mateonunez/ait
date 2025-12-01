import type { GoogleYouTubeSubscriptionEntity } from "@ait/core";
import { TextNormalizationService } from "../../metadata/text-normalization.service";
import type { EntityFormatter } from "./formatter.utils";
import { safeString } from "./formatter.utils";

const textNormalizer = new TextNormalizationService();

export const GoogleYouTubeSubscriptionFormatter: EntityFormatter<GoogleYouTubeSubscriptionEntity> = {
  format: (meta) => {
    const title = safeString(meta.title, "Untitled Channel");
    const description = safeString(meta.description);
    const channelId = safeString(meta.channelId);

    const parts: string[] = [];
    parts.push(`YouTube Subscription: ${title}`);

    if (channelId) {
      parts.push(` (Channel ID: ${channelId})`);
    }

    if (meta.publishedAt) {
      const date = new Date(meta.publishedAt);
      parts.push(
        ` subscribed on ${date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
      );
    }

    if (meta.totalItemCount > 0) {
      parts.push(` with ${meta.totalItemCount} videos`);
    }

    if (description) {
      parts.push(` - ${textNormalizer.truncate(description, 150)}`);
    }

    return parts.join("");
  },
};
