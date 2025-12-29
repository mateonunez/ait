# @ait/core

Core building blocks for AIt: shared utilities, types, error handling, HTTP client, and logging.

## Overview

The `@ait/core` package provides foundational utilities used across all AIt packages. It includes:

- **Error Handling**: Custom error classes with error codes and metadata
- **Result Type**: Type-safe error handling without exceptions
- **HTTP Client**: Fetch-based client with timeout and error handling
- **Logger**: Structured logging with correlation IDs
- **Validation**: Zod-based schema validation
- **Shared Types**: Integration types generated from OpenAPI specs

## Installation

```bash
pnpm add @ait/core
```

## Usage

### Error Handling

AIt uses custom error classes that include error codes and metadata for better debugging.

```typescript
import { AItError, RateLimitError } from '@ait/core';

// Basic error
throw new AItError('USER_NOT_FOUND', 'User does not exist', { userId: '123' });

// Rate limit error with reset time
throw new RateLimitError('spotify', Date.now() + 60000, 'API rate limit exceeded');
```

**Error Properties:**
- `code`: Machine-readable error code (e.g., `USER_NOT_FOUND`, `RATE_LIMIT`)
- `message`: Human-readable description
- `meta`: Additional context data
- `cause`: Original error (for error chaining)

### Result Type

Use the `Result` type for type-safe error handling without try-catch:

```typescript
import { Result, ok, err, AItError } from '@ait/core';

// Function returning a Result
function divide(a: number, b: number): Result<number, AItError> {
  if (b === 0) {
    return err(new AItError('DIVISION_BY_ZERO', 'Cannot divide by zero'));
  }
  return ok(a / b);
}

// Using the result
const result = divide(10, 2);

if (result.ok) {
  console.log('Result:', result.value); // 5
} else {
  console.error('Error:', result.error.code); // Never reached
}
```

**Type Definitions:**
```typescript
type Ok<T> = { ok: true; value: T };
type Err<E extends Error = Error> = { ok: false; error: E };
type Result<T, E extends Error = Error> = Ok<T> | Err<E>;
```

### HTTP Client

A lightweight HTTP client with built-in error handling and timeout support:

```typescript
import { requestJson, requestStream, type HttpRequestOptions } from '@ait/core';

// JSON request
const result = await requestJson<{ data: UserData }>('https://api.example.com/user/123', {
  method: 'GET',
  headers: { Authorization: 'Bearer token' },
  timeoutMs: 5000,
});

if (result.ok) {
  console.log('User:', result.value.data);
} else {
  console.error('Failed:', result.error.code);
}

// Streaming request
const streamResult = await requestStream('https://api.example.com/events', {
  method: 'GET',
  headers: { Accept: 'text/event-stream' },
});

if (streamResult.ok) {
  const reader = streamResult.value.body?.getReader();
  // Process stream...
}
```

**Request Options:**
```typescript
interface HttpRequestOptions {
  method?: string;           // HTTP method (default: 'GET')
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  signal?: AbortSignal;      // For request cancellation
  timeoutMs?: number;        // Request timeout in milliseconds
  isSuccessStatus?: (status: number) => boolean;  // Custom success check
}
```

### Logger

Structured logging with correlation ID support for request tracing:

```typescript
import { getLogger, setLogger, generateCorrelationId, type Logger } from '@ait/core';

const logger = getLogger();

// Basic logging
logger.info('Processing request', { userId: '123' });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Failed to fetch data', { error: err.message });
logger.debug('Cache hit', { key: 'user:123' });

// With correlation ID for request tracing
const correlationId = generateCorrelationId();
logger.info('Request started', { correlationId });

// Create a child logger with default metadata
const requestLogger = logger.child({ correlationId, service: 'gateway' });
requestLogger.info('Processing'); // Includes correlationId and service

// Custom logger implementation
const customLogger: Logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta),
  debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta),
  child: (meta) => ({ /* ... */ }),
};
setLogger(customLogger);
```

### Validation

Schema validation using Zod with Result type integration:

```typescript
import { validate, zValidators as z, type ValidationSchema } from '@ait/core';

// Define a schema
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  age: z.number().min(0).optional(),
});

type User = z.infer<typeof userSchema>;

// Validate data
const result = validate(userSchema, inputData, 'user');

if (result.ok) {
  const user: User = result.value;
  // Use validated user
} else {
  console.error('Validation failed:', result.error.meta?.errors);
}
```

### Integration Types

Pre-generated TypeScript types for supported integrations:

```typescript
import type {
  // GitHub types
  GitHubRepository,
  GitHubPullRequest,
  GitHubCommit,
  
  // Spotify types
  SpotifyTrack,
  SpotifyArtist,
  SpotifyPlaylist,
  
  // Linear types
  LinearIssue,
  LinearProject,
  
  // X (Twitter) types
  XTweet,
  XUser,
  
  // Other integrations
  NotionPage,
  SlackMessage,
  GoogleCalendarEvent,
  GoogleContact,
  GoogleYouTubeSubscription,
  GooglePhoto,
} from '@ait/core';
```

These types are generated from OpenAPI specifications and kept in sync with the external APIs.

## API Reference

### Errors

| Export | Description |
|--------|-------------|
| `AItError` | Base error class with code and metadata |
| `RateLimitError` | Rate limit error with reset time |

### Result Type

| Export | Description |
|--------|-------------|
| `Result<T, E>` | Union type of `Ok<T>` or `Err<E>` |
| `Ok<T>` | Success type with value |
| `Err<E>` | Error type with error |
| `ok(value)` | Create success result |
| `err(error)` | Create error result |

### HTTP Client

| Export | Description |
|--------|-------------|
| `requestJson<T>(url, options)` | JSON request returning `Result<HttpResponse<T>>` |
| `requestStream(url, options)` | Streaming request returning `Result<Response>` |
| `HttpRequestOptions` | Request configuration type |
| `HttpResponse<T>` | Response type with status, headers, data |

### Logger

| Export | Description |
|--------|-------------|
| `getLogger()` | Get current logger instance |
| `setLogger(logger)` | Set custom logger |
| `generateCorrelationId()` | Generate unique correlation ID |
| `Logger` | Logger interface |
| `LoggerMeta` | Metadata type for log entries |

### Validation

| Export | Description |
|--------|-------------|
| `validate(schema, data, context?)` | Validate data against schema |
| `zValidators` | Zod validators (re-exported as `z`) |
| `ValidationSchema<T>` | Schema type alias |

## Development

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Generate OpenAPI types
pnpm generate:openapi
```

## License

[MIT](../../LICENSE)

