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
 * @param allowedVendors - Optional set of allowed vendors. If provided, filters tools.
 */
export function createAllConnectorTools(
  spotifyService?: SpotifyServiceInterface,
  allowedVendors?: Set<string>,
): Record<string, Tool> {
  const tools: Record<string, Tool> = {
    ...createConversationTools(), // Internal tools always allowed
  };

  if (spotifyService && (!allowedVendors || allowedVendors.has("spotify"))) {
    Object.assign(tools, createSpotifyTools(spotifyService));
  }

  return tools;
}

export async function createAllConnectorToolsWithMCP(
  spotifyService?: SpotifyServiceInterface,
  mcpManager?: MCPClientManager,
  allowedVendors?: Set<string>,
): Promise<Record<string, Tool>> {
  const connectorTools = createAllConnectorTools(spotifyService, allowedVendors);

  if (!mcpManager) {
    return connectorTools;
  }

  const mcpTools = await new McpToolRegistry({ manager: mcpManager }).getToolsForConnectedVendors();

  if (allowedVendors) {
    const connectedVendors = mcpManager.getConnectedVendors();

    for (const key of Object.keys(mcpTools)) {
      const toolVendor = connectedVendors.find((vendor) => key.startsWith(`${vendor}_`));

      if (toolVendor && !allowedVendors.has(toolVendor)) {
        delete mcpTools[key];
      }
    }
  }

  return {
    ...connectorTools,
    ...mcpTools,
  };
}
