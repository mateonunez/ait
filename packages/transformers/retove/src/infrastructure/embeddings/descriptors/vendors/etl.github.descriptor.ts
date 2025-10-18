import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLGitHubRepositoryDescriptor implements IETLEmbeddingDescriptor<GitHubRepositoryDataTarget> {
  public getEmbeddingText(repository: GitHubRepositoryDataTarget): string {
    const parts = [
      `I built ${repository.name}`,
      repository.description ? `${repository.description}` : null,
      repository.language ? `using ${repository.language}` : null,
      repository.stars && repository.stars > 0 ? `${repository.stars} stars` : null,
      repository.forks && repository.forks > 0 ? `${repository.forks} forks` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GitHubRepositoryDataTarget): U {
    return {
      __type: "repository",
      ...entity,
    } as unknown as U;
  }
}

export const githubDescriptorsETL = {
  repository: new ETLGitHubRepositoryDescriptor(),
};
