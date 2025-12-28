import type { SpotifyServiceInterface } from "../interfaces/spotify.service.interface";
import type { MCPClientManager } from "../mcp";
import { McpToolRegistry } from "../mcp-registry";
import type { Tool } from "../types/tools";
import { createSpotifyTools } from "./domains/spotify.tools";
import { createConversationTools } from "./internal/conversation.tools";

export { createSpotifyTools } from "./domains/spotify.tools";
export { spotifySearchSchema } from "./domains/spotify.tools";
export type { SpotifySearchResult } from "./domains/spotify.tools";

export { createConversationTools } from "./internal/conversation.tools";

export { createMCPToolsForVendor, getMCPToolsSummary } from "./mcp";

/**
 * Create all connector tools (synchronous, without MCP)
 * TODO: create a service manager for connector tools
 *
 * @param spotifyService - Optional Spotify service for real-time playback tools
 */
export function createAllConnectorTools(spotifyService?: SpotifyServiceInterface): Record<string, Tool> {
  return {
    ...createSpotifyTools(spotifyService),
    ...createConversationTools(),
  };
}

export async function createAllConnectorToolsWithMCP(
  spotifyService?: SpotifyServiceInterface,
  mcpManager?: MCPClientManager,
): Promise<Record<string, Tool>> {
  const connectorTools = createAllConnectorTools(spotifyService);

  if (!mcpManager) {
    return connectorTools;
  }

  const mcpTools = await new McpToolRegistry({ manager: mcpManager }).getToolsForConnectedVendors();

  return {
    ...connectorTools,
    ...mcpTools,
  };
}
