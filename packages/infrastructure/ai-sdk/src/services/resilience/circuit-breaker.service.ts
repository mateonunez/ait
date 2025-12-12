import { getLogger } from "@ait/core";

const logger = getLogger();

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_SUCCESS_THRESHOLD = 2;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RESET_TIMEOUT_MS = 60000;
const DEFAULT_CIRCUIT_NAME = "default";

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  name?: string;
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  totalRequests: number;
  consecutiveSuccesses: number;
}

export class CircuitBreaker {
  private readonly _config: Required<CircuitBreakerConfig>;
  private _state: CircuitState = CircuitState.CLOSED;
  private _stats: CircuitStats = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    totalRequests: 0,
    consecutiveSuccesses: 0,
  };

  constructor(config: CircuitBreakerConfig = {}) {
    this._config = {
      failureThreshold: config.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD,
      successThreshold: config.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      resetTimeout: config.resetTimeout ?? DEFAULT_RESET_TIMEOUT_MS,
      name: config.name ?? DEFAULT_CIRCUIT_NAME,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this._stats.totalRequests++;

    if (this._state === CircuitState.OPEN) {
      if (this._shouldAttemptReset()) {
        this._transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitBreakerOpenError(this._config.name, this._getRemainingTimeout());
      }
    }

    try {
      const result = await this._executeWithTimeout(fn);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  private async _executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Circuit breaker timeout after ${this._config.timeout}ms`)),
          this._config.timeout,
        ),
      ),
    ]);
  }

  private _onSuccess(): void {
    this._stats.successes++;
    this._stats.consecutiveSuccesses++;

    if (this._state === CircuitState.HALF_OPEN) {
      if (this._stats.consecutiveSuccesses >= this._config.successThreshold) {
        this._transitionTo(CircuitState.CLOSED);
      }
    } else if (this._state === CircuitState.CLOSED) {
      this._stats.failures = Math.max(0, this._stats.failures - 1);
    }
  }

  private _onFailure(): void {
    this._stats.failures++;
    this._stats.lastFailureTime = Date.now();
    this._stats.consecutiveSuccesses = 0;

    if (this._state === CircuitState.HALF_OPEN) {
      this._transitionTo(CircuitState.OPEN);
    } else if (this._state === CircuitState.CLOSED && this._stats.failures >= this._config.failureThreshold) {
      this._transitionTo(CircuitState.OPEN);
    }
  }

  private _shouldAttemptReset(): boolean {
    return Date.now() - this._stats.lastFailureTime >= this._config.resetTimeout;
  }

  private _getRemainingTimeout(): number {
    return Math.max(0, this._config.resetTimeout - (Date.now() - this._stats.lastFailureTime));
  }

  private _transitionTo(newState: CircuitState): void {
    const oldState = this._state;
    this._state = newState;

    if (newState === CircuitState.CLOSED) {
      this._stats.failures = 0;
      this._stats.consecutiveSuccesses = 0;
    }

    logger.info(`Circuit breaker [${this._config.name}] transitioned ${oldState} → ${newState}`, {
      failures: this._stats.failures,
      totalRequests: this._stats.totalRequests,
    });
  }

  getState(): CircuitState {
    return this._state;
  }

  getStats(): Readonly<CircuitStats & { state: CircuitState }> {
    return { ...this._stats, state: this._state };
  }

  reset(): void {
    this._state = CircuitState.CLOSED;
    this._stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      totalRequests: 0,
      consecutiveSuccesses: 0,
    };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly remainingTimeoutMs: number,
  ) {
    super(`Circuit breaker [${circuitName}] is OPEN. Retry after ${Math.ceil(remainingTimeoutMs / 1000)}s`);
    this.name = "CircuitBreakerOpenError";
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ ...config, name }));
  }
  return circuitBreakers.get(name)!;
}

export function resetCircuitBreaker(name: string): void {
  circuitBreakers.get(name)?.reset();
}

export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
}

export function getCircuitBreakerStats(): Record<string, ReturnType<CircuitBreaker["getStats"]>> {
  const stats: Record<string, ReturnType<CircuitBreaker["getStats"]>> = {};
  for (const [name, breaker] of circuitBreakers) {
    stats[name] = breaker.getStats();
  }
  return stats;
}
