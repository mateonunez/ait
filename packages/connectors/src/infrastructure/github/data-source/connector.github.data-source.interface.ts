import type { RestEndpointMethodTypes } from "@octokit/rest";
import type { GitHubRepository } from "../../../domain/entities/github/connector.github.entities";

export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(): Promise<GitHubRepository[]>;
}
