import type { SpotifyServiceInterface } from "../interfaces/spotify.service.interface";
import type { MCPClientManager } from "../mcp";
import type { Tool } from "../types/tools";
import { createSpotifyTools } from "./domains/spotify.tools";
import { createAllMCPTools } from "./mcp";

export { createSpotifyTools } from "./domains/spotify.tools";
export { spotifySearchSchema } from "./domains/spotify.tools";
export type { SpotifySearchResult } from "./domains/spotify.tools";

export { createAllMCPTools, createMCPToolsForVendor, getMCPToolsSummary } from "./mcp";

/**
 * Create all connector tools (synchronous, without MCP)
 * TODO: create a service manager for connector tools
 *
 * @param spotifyService - Optional Spotify service for real-time playback tools
 */
export function createAllConnectorTools(spotifyService?: SpotifyServiceInterface): Record<string, Tool> {
  return {
    ...createSpotifyTools(spotifyService),
  };
}

/**
 * Create all connector tools including MCP tools (async)
 *
 * This function creates tools from both:
 * 1. Local connector services (e.g., Spotify real-time playback)
 * 2. Connected MCP servers (e.g., Notion, GitHub write operations)
 *
 * @param spotifyService - Optional Spotify service for real-time playback tools
 * @param mcpManager - Optional MCP client manager for MCP tools
 */
export async function createAllConnectorToolsWithMCP(
  spotifyService?: SpotifyServiceInterface,
  mcpManager?: MCPClientManager,
): Promise<Record<string, Tool>> {
  const connectorTools = createAllConnectorTools(spotifyService);

  if (!mcpManager) {
    return connectorTools;
  }

  const mcpTools = await createAllMCPTools(mcpManager);

  return {
    ...connectorTools,
    ...mcpTools,
  };
}
