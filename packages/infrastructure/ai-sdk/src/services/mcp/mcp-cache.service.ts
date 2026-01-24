import { getLogger } from "@ait/core";
import type { MCPTool, MCPVendor } from "../../mcp";
import { getCacheProvider } from "../../providers";

const logger = getLogger();

export interface IMCPCacheService {
  getCachedTools(vendor: MCPVendor, userId: string): Promise<MCPTool[] | null>;
  cacheTools(vendor: MCPVendor, userId: string, tools: MCPTool[]): Promise<void>;
}

export class MCPCacheService implements IMCPCacheService {
  private static readonly CACHE_TTL = 3600 * 1000; // 1 hour

  async getCachedTools(vendor: MCPVendor, userId: string): Promise<MCPTool[] | null> {
    const cacheProvider = getCacheProvider();
    if (!cacheProvider) return null;

    const key = this._getCacheKey(vendor, userId);
    try {
      return await cacheProvider.get<MCPTool[]>(key);
    } catch (error) {
      logger.debug(`[MCPCache] Failed to get cached tools for ${vendor}`, { error });
      return null;
    }
  }

  async cacheTools(vendor: MCPVendor, userId: string, tools: MCPTool[]): Promise<void> {
    const cacheProvider = getCacheProvider();
    if (!cacheProvider) return;

    const key = this._getCacheKey(vendor, userId);
    try {
      await cacheProvider.set(key, tools, MCPCacheService.CACHE_TTL);
    } catch (error) {
      logger.debug(`[MCPCache] Failed to cache tools for ${vendor}`, { error });
    }
  }

  private _getCacheKey(vendor: MCPVendor, userId: string): string {
    return `mcp:tools:${vendor}:${userId}`;
  }
}

let mcpCacheService: MCPCacheService | null = null;

export function getMCPCacheService(): MCPCacheService {
  if (!mcpCacheService) {
    mcpCacheService = new MCPCacheService();
  }
  return mcpCacheService;
}
