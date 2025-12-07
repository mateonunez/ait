export type MCPVendor = "notion" | "github" | "linear" | "slack";

/**
 * Transport types for MCP connections
 * - http: Streamable HTTP transport for hosted MCP servers
 * - sse: Server-Sent Events transport
 * - stdio: Standard I/O transport for local MCP servers (spawns npx process)
 */
export type MCPTransport = "http" | "sse" | "stdio";

export interface MCPServerConfig {
  name: MCPVendor;
  url: string;
  transport: MCPTransport;
  authHeader: string;
  tokenSource: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
  npmPackage?: string;
  tokenEnvVar?: string;
}

export type MCPClientState = "disconnected" | "connecting" | "connected" | "error";

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolResult {
  success: boolean;
  content?: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  error?: string;
  isError?: boolean;
}

export interface MCPToolCallRequest {
  vendor: MCPVendor;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface MCPClientInfo {
  vendor: MCPVendor;
  state: MCPClientState;
  connectedAt?: Date;
  tools: MCPTool[];
  lastError?: string;
}

export interface MCPConnectOptions {
  accessToken: string;
  env?: Record<string, string>;
  timeout?: number;
  autoReconnect?: boolean;
}

export type MCPTokenProvider = (vendor: MCPVendor) => Promise<string | null>;
