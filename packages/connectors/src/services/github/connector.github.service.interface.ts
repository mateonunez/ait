import type { NormalizedGitHubRepository } from "../../infrastructure/github/normalizer/connector.github.normalizer.interface";

export interface IConnectorGitHubService {
  getRepositories(): Promise<NormalizedGitHubRepository[]>;
}
