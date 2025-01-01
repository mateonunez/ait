export class ConnectorOAuthRequestError extends Error {
  public statusCode: number;
  public responseBody: string;

  constructor(statusCode: number, message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorOAuthRequestError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorOAuthRequestError.prototype);
  }
}

export class ConnectorOAuthJsonParseError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorOAuthJsonParseError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorOAuthJsonParseError.prototype);
  }
}
