import type { LinearIssueEntity } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { safeString, safeNumber, safeArray } from "./formatter.utils";
import { TextNormalizationService } from "../../metadata/text-normalization.service";

const textNormalizer = new TextNormalizationService();

export const LinearIssueFormatter: EntityFormatter<LinearIssueEntity> = {
  format: (meta) => {
    const title = safeString(meta.title, "Unnamed Issue");
    const description = safeString(meta.description);
    const state = safeString(meta.state);
    const priority = safeNumber(meta.priority);
    const labels = safeArray<string>(meta.labels);
    const assigneeName = safeString(meta.assigneeName);
    const teamName = safeString(meta.teamName);
    const projectName = safeString(meta.projectName);

    const priorityLabels: Record<number, string> = {
      0: "Urgent",
      1: "High",
      2: "Medium",
      3: "Low",
      4: "No priority",
    };
    const priorityLabel = priority !== null ? priorityLabels[priority] || `Priority ${priority}` : null;

    const parts: string[] = [`Issue: "${title}"`];
    if (state) parts.push(` [${state}]`);
    if (teamName) parts.push(` in ${teamName}`);
    if (priorityLabel) parts.push(` (${priorityLabel})`);
    if (assigneeName) parts.push(`, assigned to ${assigneeName}`);
    if (projectName) parts.push(`, project: ${projectName}`);
    if (description) parts.push(`\n${textNormalizer.truncate(description, 200)}`);
    if (labels.length > 0) parts.push(`\nLabels: ${labels.join(", ")}`);

    return parts.join("");
  },
};
