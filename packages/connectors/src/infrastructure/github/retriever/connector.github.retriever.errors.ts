export class ConnectorGitHubDataRetrieverFetchRepositoriesError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorGitHubDataRetrieverFetchRepositoriesError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorGitHubDataRetrieverFetchRepositoriesError.prototype);
  }
}
