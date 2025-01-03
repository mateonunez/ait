export class ConnectorGitHubDataSourceFetchRepositoriesError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorGitHubDataSourceFetchRepositoriesError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorGitHubDataSourceFetchRepositoriesError.prototype);
  }
}
