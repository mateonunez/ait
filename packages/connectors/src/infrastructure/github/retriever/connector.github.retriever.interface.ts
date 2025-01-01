import type { RestEndpointMethodTypes } from "@octokit/rest";

export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubRetriever {
  fetchRepositories(
    code: string
  ): Promise<ConnectorGitHubFetchRepositoriesResponse>;
}
