import type { XTweetEntity } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { joinParts, safeNumber, safeString } from "./formatter.utils";

export const XTweetFormatter: EntityFormatter<XTweetEntity> = {
  format: (meta, pageContent) => {
    const text = safeString(meta.text || pageContent, "");
    const retweetCount = safeNumber(meta.retweetCount);
    const likeCount = safeNumber(meta.likeCount);
    const replyCount = safeNumber(meta.replyCount);
    const authorName = safeString(meta.authorName);
    const authorUsername = safeString(meta.authorUsername);

    const engagement: string[] = [];
    if (retweetCount !== null && retweetCount > 0) engagement.push(`${retweetCount} retweets`);
    if (likeCount !== null && likeCount > 0) engagement.push(`${likeCount} likes`);
    if (replyCount !== null && replyCount > 0) engagement.push(`${replyCount} replies`);

    const authorInfo = authorName || authorUsername ? ` (@${authorUsername || authorName})` : "";

    return joinParts(`I tweeted${authorInfo}: ${text}`, engagement.length > 0 ? ` (${engagement.join(", ")})` : null);
  },
};
