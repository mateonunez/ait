import type { GitHubRepositoryEntity } from "../../domain/entities/github/connector.github.entities";

export interface IConnectorGitHubService {
  getRepositories(): Promise<GitHubRepositoryEntity[]>;
}
