import type { MCPServerConfig, MCPVendor } from "./mcp.types";

/**
 * Registry of all supported MCP servers
 *
 * Supported transports:
 * - http: Vendor-hosted MCP servers (e.g., GitHub Copilot MCP)
 * - stdio: Local MCP servers via npx (e.g., Notion MCP with internal token)
 */
export const MCP_SERVERS: Record<MCPVendor, MCPServerConfig> = {
  notion: {
    name: "notion",
    // Use local MCP server via stdio - hosted MCP requires different OAuth flow
    url: "",
    transport: "stdio",
    authHeader: "Authorization",
    tokenSource: "notion",
    npmPackage: "@notionhq/notion-mcp-server",
    tokenEnvVar: "NOTION_TOKEN",
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
  },
  github: {
    name: "github",
    // Use local MCP server via stdio
    url: "",
    transport: "stdio",
    authHeader: "Authorization",
    tokenSource: "github",
    npmPackage: "@modelcontextprotocol/server-github",
    tokenEnvVar: "GITHUB_PERSONAL_ACCESS_TOKEN",
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
  },
} as const;

export function getMCPServerConfig(vendor: MCPVendor): MCPServerConfig {
  const config = MCP_SERVERS[vendor];
  if (!config) {
    throw new Error(`Unknown MCP vendor: ${vendor}`);
  }
  return config;
}

export function getMCPVendors(): MCPVendor[] {
  return Object.keys(MCP_SERVERS) as MCPVendor[];
}

export function hasMCPServer(vendor: string): vendor is MCPVendor {
  return vendor in MCP_SERVERS;
}
