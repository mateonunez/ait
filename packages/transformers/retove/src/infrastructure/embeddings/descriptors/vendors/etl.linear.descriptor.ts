import type { LinearIssueDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLLinearIssueDescriptor implements IETLEmbeddingDescriptor<LinearIssueDataTarget> {
  public getEmbeddingText(issue: LinearIssueDataTarget): string {
    return JSON.stringify(issue, null, 2).replace(/{/g, "{{").replace(/}/g, "}}");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: LinearIssueDataTarget): U {
    return {
      __type: "issue",
      ...entity,
    } as unknown as U;
  }
}

export const linearDescriptorsETL = {
  issue: new ETLLinearIssueDescriptor(),
};
