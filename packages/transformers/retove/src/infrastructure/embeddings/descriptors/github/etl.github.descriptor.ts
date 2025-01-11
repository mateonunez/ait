import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLGitHubRepositoryDescriptor implements IETLEmbeddingDescriptor<GitHubRepositoryDataTarget> {
  public getEmbeddingText(repository: GitHubRepositoryDataTarget): string {
    return JSON.stringify(repository, null, 2).replace(/{/g, '{{').replace(/}/g, '}}');
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GitHubRepositoryDataTarget): U {
    return {
      type: "repository",
      ...entity,
    } as unknown as U;
  }
}

export const githubDescriptorsETL = {
  repository: new ETLGitHubRepositoryDescriptor(),
};
