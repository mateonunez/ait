import type { RestEndpointMethodTypes } from "@octokit/rest";
import type { GitHubRepository } from "../normalizer/connector.github.normalizer.interface";

export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(): Promise<GitHubRepository[]>;
}
