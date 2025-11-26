import { AItError } from "./ait-error";

export class RateLimitError extends AItError {
  readonly resetTime: number; // Timestamp in milliseconds

  constructor(source: string, resetTime: number, message = "Rate limit exceeded") {
    super("RATE_LIMIT", message, { source, resetTime });
    this.name = "RateLimitError";
    this.resetTime = resetTime;
  }
}
