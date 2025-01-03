export class ConnectorSpotifyDataSourceError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorSpotifyDataSourceError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorSpotifyDataSourceError.prototype);
  }
}
