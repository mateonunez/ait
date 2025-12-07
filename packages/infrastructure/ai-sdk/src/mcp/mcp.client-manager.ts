import { getLogger } from "@ait/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getMCPServerConfig } from "./mcp.registry";
import type {
  MCPClientInfo,
  MCPClientState,
  MCPConnectOptions,
  MCPServerConfig,
  MCPTool,
  MCPToolResult,
  MCPVendor,
} from "./mcp.types";

const logger = getLogger();

interface MCPClientConnection {
  client: Client;
  vendor: MCPVendor;
  state: MCPClientState;
  connectedAt?: Date;
  tools: MCPTool[];
  lastError?: string;
  transport?: StdioClientTransport;
}

/**
 * Manages connections to multiple MCP servers
 *
 * This manager handles the lifecycle of MCP client connections,
 * allowing the application to connect to multiple vendor MCP servers
 * simultaneously and execute tools across them.
 *
 * Supports both:
 * - Hosted MCP servers (http/sse transport) - e.g., GitHub Copilot MCP
 * - Local MCP servers (stdio transport) - e.g., Notion MCP via npx
 *
 * @example
 * ```typescript
 * const manager = getMCPClientManager();
 *
 * // Connect to Notion MCP with internal integration token
 * await manager.connect("notion", { accessToken: "ntn_..." });
 *
 * // List available tools
 * const tools = await manager.listTools("notion");
 *
 * // Execute a tool
 * const result = await manager.executeTool("notion", "create_page", {
 *   parent: { page_id: "xxx" },
 *   properties: { title: [{ text: { content: "Test" } }] }
 * });
 * ```
 */
export class MCPClientManager {
  private _clients: Map<MCPVendor, MCPClientConnection> = new Map();
  private _connectionPromises: Map<MCPVendor, Promise<void>> = new Map();

  async connect(vendor: MCPVendor, options: MCPConnectOptions): Promise<void> {
    const existingPromise = this._connectionPromises.get(vendor);
    if (existingPromise) {
      return existingPromise;
    }
    const existing = this._clients.get(vendor);
    if (existing?.state === "connected") {
      logger.debug(`[MCP] Already connected to ${vendor}`);
      return;
    }

    const connectionPromise = this._doConnect(vendor, options);
    this._connectionPromises.set(vendor, connectionPromise);

    try {
      await connectionPromise;
    } finally {
      this._connectionPromises.delete(vendor);
    }
  }

  private async _doConnect(vendor: MCPVendor, options: MCPConnectOptions): Promise<void> {
    const config = getMCPServerConfig(vendor);

    if (config.transport === "stdio") {
      logger.info(`[MCP] Connecting to ${vendor} via stdio (${config.npmPackage})`);
    } else {
      logger.info(`[MCP] Connecting to ${vendor} at ${config.url}`);
    }

    const client = new Client({
      name: "ait-client",
      version: "1.0.0",
    });

    const connection: MCPClientConnection = {
      client,
      vendor,
      state: "connecting",
      tools: [],
    };
    this._clients.set(vendor, connection);

    try {
      const transport = await this._createTransport(config, options.accessToken);

      // Store transport reference for stdio cleanup
      if (config.transport === "stdio" && transport instanceof StdioClientTransport) {
        connection.transport = transport;
      }

      await client.connect(transport);

      const toolsResult = await client.listTools();
      const tools: MCPTool[] = toolsResult.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as MCPTool["inputSchema"],
      }));

      connection.state = "connected";
      connection.connectedAt = new Date();
      connection.tools = tools;

      logger.info(`[MCP] Connected to ${vendor}, ${tools.length} tools available`);
    } catch (error) {
      connection.state = "error";
      connection.lastError = error instanceof Error ? error.message : String(error);
      logger.error(`[MCP] Failed to connect to ${vendor}:`, { error: connection.lastError });
      throw error;
    }
  }

  private async _createTransport(
    config: MCPServerConfig,
    accessToken: string,
  ): Promise<StreamableHTTPClientTransport | SSEClientTransport | StdioClientTransport> {
    const { transport, url, npmPackage, tokenEnvVar } = config;

    if (transport === "stdio") {
      if (!npmPackage) {
        throw new Error(`MCP server ${config.name} requires npmPackage for stdio transport`);
      }

      // Create environment with the token
      const env: Record<string, string> = {
        ...process.env,
      } as Record<string, string>;

      if (tokenEnvVar) {
        env[tokenEnvVar] = accessToken;
        if (config.name === "github") {
          env.GITHUB_TOKEN = accessToken;
        }
      }

      // Create stdio transport that spawns the MCP server via npx
      const stdioTransport = new StdioClientTransport({
        command: "npx",
        args: ["-y", npmPackage],
        env,
      });

      return stdioTransport;
    }

    // HTTP-based transports
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (transport === "sse") {
      return new SSEClientTransport(new URL(url), {
        requestInit: { headers },
      });
    }

    // Default: Streamable HTTP
    return new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
    });
  }

  async disconnect(vendor: MCPVendor): Promise<void> {
    const connection = this._clients.get(vendor);
    if (!connection) {
      return;
    }

    try {
      await connection.client.close();

      // For stdio transport, ensure the process is terminated
      if (connection.transport) {
        try {
          await connection.transport.close();
        } catch {
          // Process may already be terminated
        }
      }

      logger.info(`[MCP] Disconnected from ${vendor}`);
    } catch (error) {
      logger.warn(`[MCP] Error disconnecting from ${vendor}:`, { error });
    } finally {
      this._clients.delete(vendor);
    }
  }

  async disconnectAll(): Promise<void> {
    const vendors = Array.from(this._clients.keys());
    await Promise.all(vendors.map((v) => this.disconnect(v)));
  }

  isConnected(vendor: MCPVendor): boolean {
    const connection = this._clients.get(vendor);
    return connection?.state === "connected";
  }

  getClientInfo(vendor: MCPVendor): MCPClientInfo | null {
    const connection = this._clients.get(vendor);
    if (!connection) {
      return null;
    }

    return {
      vendor: connection.vendor,
      state: connection.state,
      connectedAt: connection.connectedAt,
      tools: connection.tools,
      lastError: connection.lastError,
    };
  }

  getConnectedVendors(): MCPVendor[] {
    return Array.from(this._clients.entries())
      .filter(([_, conn]) => conn.state === "connected")
      .map(([vendor]) => vendor);
  }

  async listTools(vendor?: MCPVendor): Promise<MCPTool[]> {
    if (vendor) {
      const connection = this._clients.get(vendor);
      if (!connection || connection.state !== "connected") {
        throw new Error(`Not connected to ${vendor} MCP server`);
      }
      return connection.tools;
    }

    const allTools: MCPTool[] = [];
    for (const [v, connection] of this._clients.entries()) {
      if (connection.state === "connected") {
        const prefixedTools = connection.tools.map((t) => ({
          ...t,
          name: `${v}_${t.name}`,
          description: `[${v.toUpperCase()}] ${t.description || ""}`,
        }));
        allTools.push(...prefixedTools);
      }
    }
    return allTools;
  }

  async executeTool(vendor: MCPVendor, toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const connection = this._clients.get(vendor);
    if (!connection || connection.state !== "connected") {
      return {
        success: false,
        error: `Not connected to ${vendor} MCP server`,
      };
    }

    try {
      logger.debug(`[MCP] Executing tool ${toolName} on ${vendor}`, { args });

      const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
      });

      const content = (result.content as Array<{ type: string; text?: string }>)?.map((c) => ({
        type: c.type as "text" | "image" | "resource",
        text: c.text,
      }));

      logger.debug(`[MCP] Tool ${toolName} completed on ${vendor}`, { isError: result.isError });

      return {
        success: !result.isError,
        content,
        isError: !!result.isError,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[MCP] Tool ${toolName} failed on ${vendor}:`, { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

let mcpClientManagerInstance: MCPClientManager | null = null;

export function getMCPClientManager(): MCPClientManager {
  if (!mcpClientManagerInstance) {
    mcpClientManagerInstance = new MCPClientManager();
  }
  return mcpClientManagerInstance;
}

export async function resetMCPClientManager(): Promise<void> {
  if (mcpClientManagerInstance) {
    await mcpClientManagerInstance.disconnectAll();
    mcpClientManagerInstance = null;
  }
}
