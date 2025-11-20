import type { NotionPageEntity } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { safeString } from "./formatter.utils";
import { TextNormalizationService } from "../../metadata/text-normalization.service";

const textNormalizer = new TextNormalizationService();

export const NotionPageFormatter: EntityFormatter<NotionPageEntity> = {
  format: (meta, pageContent) => {
    const title = safeString(meta.title, "Untitled Page");
    const content = safeString(meta.content || pageContent);
    const parentType = safeString(meta.parentType);
    const archived = meta.archived ? " [Archived]" : "";

    const parts: string[] = [`Notion page: "${title}"${archived}`];
    if (parentType && parentType !== "workspace") {
      parts.push(` in ${parentType}`);
    }
    if (content) {
      parts.push(`\n${textNormalizer.truncate(content, 300)}`);
    }

    return parts.join("");
  },
};
