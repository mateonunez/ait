import type { RestEndpointMethodTypes } from "@octokit/rest";

export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(): Promise<ConnectorGitHubFetchRepositoriesResponse>;
}
