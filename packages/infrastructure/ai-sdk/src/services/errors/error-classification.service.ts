/**
 * Error categories for classification
 */
export enum ErrorCategory {
  RAG_FAILURE = "rag_failure",
  TOOL_TIMEOUT = "tool_timeout",
  TOOL_EXECUTION = "tool_execution",
  LLM_ERROR = "llm_error",
  EMBEDDING_ERROR = "embedding_error",
  NETWORK_ERROR = "network_error",
  VALIDATION_ERROR = "validation_error",
  RATE_LIMIT = "rate_limit",
  AUTHENTICATION = "authentication",
  UNKNOWN = "unknown",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = "critical", // Service completely unavailable
  ERROR = "error", // Request failed but service operational
  WARNING = "warning", // Degraded performance or fallback used
  INFO = "info", // Expected error conditions
}

/**
 * Classified error with metadata
 */
export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  fingerprint: string;
  isRetryable: boolean;
  suggestedAction?: string;
  metadata: Record<string, unknown>;
}

/**
 * Service for classifying and fingerprinting errors
 */
export class ErrorClassificationService {
  /**
   * Classify an error based on its characteristics
   */
  classify(error: Error | unknown, context?: string): ClassifiedError {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();
    const stack = err.stack?.toLowerCase() ?? "";
    const haystack = `${message}\n${stack}`;

    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.ERROR;
    let isRetryable = false;
    let suggestedAction: string | undefined;

    // RAG failures
    if (
      haystack.includes("rag") ||
      haystack.includes("retrieval") ||
      haystack.includes("vector") ||
      haystack.includes("qdrant") ||
      haystack.includes("embedding")
    ) {
      if (haystack.includes("embedding")) {
        category = ErrorCategory.EMBEDDING_ERROR;
        severity = ErrorSeverity.ERROR;
        isRetryable = true;
        suggestedAction = "Retry with exponential backoff";
      } else {
        category = ErrorCategory.RAG_FAILURE;
        severity = ErrorSeverity.WARNING;
        isRetryable = true;
        suggestedAction = "Continue without RAG context";
      }
    }
    // Tool errors
    else if (haystack.includes("tool") || context?.includes("tool")) {
      if (haystack.includes("timeout")) {
        category = ErrorCategory.TOOL_TIMEOUT;
        severity = ErrorSeverity.WARNING;
        isRetryable = true;
        suggestedAction = "Increase timeout or use cached results";
      } else {
        category = ErrorCategory.TOOL_EXECUTION;
        severity = ErrorSeverity.ERROR;
        isRetryable = true;
        suggestedAction = "Retry with different parameters";
      }
    }
    // LLM errors
    else if (
      haystack.includes("llm") ||
      haystack.includes("generation") ||
      haystack.includes("model") ||
      haystack.includes("ollama") ||
      haystack.includes("stream") ||
      haystack.includes("internal server error")
    ) {
      category = ErrorCategory.LLM_ERROR;
      severity = ErrorSeverity.CRITICAL;
      isRetryable = true;
      suggestedAction = "Retry or switch to fallback model";
    }
    // Network errors
    else if (
      haystack.includes("network") ||
      haystack.includes("fetch") ||
      haystack.includes("econnrefused") ||
      haystack.includes("timeout") ||
      haystack.includes("enotfound")
    ) {
      category = ErrorCategory.NETWORK_ERROR;
      severity = ErrorSeverity.ERROR;
      isRetryable = true;
      suggestedAction = "Check network connectivity and retry";
    }
    // Rate limiting
    else if (haystack.includes("rate limit") || haystack.includes("429") || haystack.includes("too many requests")) {
      category = ErrorCategory.RATE_LIMIT;
      severity = ErrorSeverity.WARNING;
      isRetryable = true;
      suggestedAction = "Wait and retry with exponential backoff";
    }
    // Authentication
    else if (
      haystack.includes("auth") ||
      haystack.includes("unauthorized") ||
      haystack.includes("401") ||
      haystack.includes("403")
    ) {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.ERROR;
      isRetryable = false;
      suggestedAction = "Check credentials and permissions";
    }
    // Validation
    else if (haystack.includes("validation") || haystack.includes("invalid") || haystack.includes("required")) {
      category = ErrorCategory.VALIDATION_ERROR;
      severity = ErrorSeverity.INFO;
      isRetryable = false;
      suggestedAction = "Fix input parameters";
    }

    const fingerprint = this.generateFingerprint(err, category, context);

    return {
      category,
      severity,
      message: err.message,
      originalError: err,
      fingerprint,
      isRetryable,
      suggestedAction,
      metadata: {
        name: err.name,
        stack: err.stack?.split("\n").slice(0, 3).join("\n"), // First 3 lines of stack
        context,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate a fingerprint for grouping similar errors
   * Uses error type, category, and normalized message
   */
  generateFingerprint(error: Error, category: ErrorCategory, context?: string): string {
    // Normalize error message by removing dynamic content
    const normalizedMessage = this.normalizeErrorMessage(error.message);

    // Extract relevant stack trace location (first app frame)
    const stackLocation = this.extractStackLocation(error.stack);

    // Combine components for fingerprint
    const components = [error.name, category, normalizedMessage, stackLocation, context || "unknown"].filter(Boolean);

    // Generate simple hash
    const fingerprintString = components.join("|");
    return `err_${this.simpleHash(fingerprintString)}`;
  }

  /**
   * Normalize error message by removing variable content
   */
  private normalizeErrorMessage(message: string): string {
    return (
      message
        .toLowerCase()
        // Remove UUIDs
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
        // Remove numbers
        .replace(/\d+/g, "<num>")
        // Remove timestamps
        .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/g, "<timestamp>")
        // Remove file paths
        .replace(/[\/\\][\w\/\\.-]+/g, "<path>")
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, "<url>")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Extract first relevant stack trace location
   */
  private extractStackLocation(stack?: string): string {
    if (!stack) return "unknown";

    const lines = stack.split("\n");
    // Skip first line (error message) and find first non-node_modules frame
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (line && !line.includes("node_modules") && !line.includes("node:internal")) {
        // Extract file and line number
        const match = line.match(/at\s+(?:.*?\s+\()?([^)]+):(\d+):(\d+)/);
        if (match) {
          const file = match[1]?.split("/").pop() ?? match[1] ?? "unknown";
          return `${file}:${match[2]}`;
        }
      }
    }

    return "unknown";
  }

  /**
   * Simple hash function for fingerprint generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 12);
  }

  /**
   * Determine if error should trigger an alert
   */
  shouldAlert(classifiedError: ClassifiedError, recentErrorCount: number): boolean {
    // Critical errors always alert
    if (classifiedError.severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Alert if error rate is high (>5 of same fingerprint in short time)
    if (recentErrorCount > 5) {
      return true;
    }

    // Authentication errors alert
    if (classifiedError.category === ErrorCategory.AUTHENTICATION) {
      return true;
    }

    return false;
  }
}

// Singleton instance
let _errorClassificationService: ErrorClassificationService | null = null;

export function getErrorClassificationService(): ErrorClassificationService {
  if (!_errorClassificationService) {
    _errorClassificationService = new ErrorClassificationService();
  }
  return _errorClassificationService;
}
