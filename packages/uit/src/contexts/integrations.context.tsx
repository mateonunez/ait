import {
  githubService,
  googleService,
  linearService,
  notionService,
  slackService,
  spotifyService,
  xService,
} from "@/services";
import type { CachedEntityData, CachedIntegrationData, IntegrationEntity } from "@/types/integrations.types";
import {
  type EntityType,
  type IntegrationVendor,
  type PaginatedResponse,
  type PaginationParams,
  getLogger,
} from "@ait/core";
import { type ReactNode, createContext, useCallback, useContext, useState } from "react";

const logger = getLogger();

interface IntegrationsContextValue {
  cache: CachedIntegrationData;
  fetchEntityData: (
    vendor: IntegrationVendor,
    entityType: EntityType,
    params?: PaginationParams,
  ) => Promise<PaginatedResponse<IntegrationEntity>>;
  getCachedData: (vendor: IntegrationVendor, entityType: EntityType) => CachedEntityData | null;
  refreshVendor: (vendor: IntegrationVendor) => Promise<void>;
  clearCache: (vendor?: IntegrationVendor, entityType?: EntityType) => void;
  isLoading: boolean;
}

const IntegrationsContext = createContext<IntegrationsContextValue | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<CachedIntegrationData>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntityData = useCallback(
    async (
      vendor: IntegrationVendor,
      entityType: EntityType,
      params?: PaginationParams,
    ): Promise<PaginatedResponse<IntegrationEntity>> => {
      const vendorCache = cache[vendor];
      const entityCache = vendorCache?.[entityType];
      const requestedLimit = params?.limit || 50;
      const requestedPage = params?.page || 1;

      // Return cached data only for page 1 AND when limits match exactly
      // This prevents integration pages (limit: 50) from using homepage cache (limit: 10-15)
      if (entityCache && requestedPage === 1 && entityCache.pagination.limit === requestedLimit) {
        return {
          data: entityCache.data,
          pagination: entityCache.pagination,
        };
      }

      setIsLoading(true);
      try {
        let response: PaginatedResponse<IntegrationEntity>;

        switch (vendor) {
          case "spotify": {
            switch (entityType) {
              case "track":
                response = await spotifyService.fetchTracks(params);
                break;
              case "artist":
                response = await spotifyService.fetchArtists(params);
                break;
              case "playlist":
                response = await spotifyService.fetchPlaylists(params);
                break;
              case "album":
                response = await spotifyService.fetchAlbums(params);
                break;
              case "recently_played":
                response = await spotifyService.fetchRecentlyPlayed(params);
                break;
              default:
                throw new Error(`Unknown Spotify entity type: ${entityType}`);
            }
            break;
          }
          case "github": {
            switch (entityType) {
              case "repository":
                response = await githubService.fetchRepositories(params);
                break;
              case "pull_request":
                response = await githubService.fetchPullRequests(params);
                break;
              case "commit":
                response = await githubService.fetchCommits(params);
                break;
              case "repository_file":
                response = await githubService.fetchFiles(params);
                break;
              default:
                throw new Error(`Unknown GitHub entity type: ${entityType}`);
            }
            break;
          }
          case "x": {
            if (entityType === "tweet") {
              response = await xService.fetchTweets(params);
            } else {
              throw new Error(`Unknown X entity type: ${entityType}`);
            }
            break;
          }
          case "linear": {
            if (entityType === "issue") {
              response = await linearService.fetchIssues(params);
            } else {
              throw new Error(`Unknown Linear entity type: ${entityType}`);
            }
            break;
          }
          case "notion": {
            if (entityType === "page") {
              response = await notionService.fetchPages(params);
            } else {
              throw new Error(`Unknown Notion entity type: ${entityType}`);
            }
            break;
          }
          case "slack": {
            if (entityType === "message") {
              response = await slackService.fetchMessages(params);
            } else {
              throw new Error(`Unknown Slack entity type: ${entityType}`);
            }
            break;
          }
          case "google": {
            switch (entityType) {
              case "event":
                response = await googleService.fetchEvents(params);
                break;
              case "calendar":
                response = await googleService.fetchCalendars(params);
                break;
              case "subscription":
                response = await googleService.fetchSubscriptions(params);
                break;
              default:
                throw new Error(`Unknown Google entity type: ${entityType}`);
            }
            break;
          }
          default:
            throw new Error(`Unknown vendor: ${vendor}`);
        }

        if (!params?.page || params.page === 1) {
          setCache((prev) => ({
            ...prev,
            [vendor]: {
              ...prev[vendor],
              [entityType]: {
                data: response.data,
                pagination: response.pagination,
                lastFetched: new Date(),
              },
            },
          }));
        }

        return response;
      } catch (error) {
        logger.error(`Failed to fetch ${vendor} ${entityType}:`, { error });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [cache],
  );

  const getCachedData = useCallback(
    (vendor: IntegrationVendor, entityType: EntityType): CachedEntityData | null => {
      return cache[vendor]?.[entityType] || null;
    },
    [cache],
  );

  const refreshVendor = useCallback(async (vendor: IntegrationVendor) => {
    setIsLoading(true);
    try {
      switch (vendor) {
        case "spotify":
          await spotifyService.refresh();
          break;
        case "github":
          await githubService.refresh();
          break;
        case "x":
          await xService.refresh();
          break;
        case "linear":
          await linearService.refresh();
          break;
        case "notion":
          await notionService.refresh();
          break;
        case "slack":
          await slackService.refresh();
          break;
        case "google":
          await googleService.refresh();
          break;
      }

      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[vendor];
        return newCache;
      });
    } catch (error) {
      logger.error(`Failed to refresh ${vendor}:`, { error });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback((vendor?: IntegrationVendor, entityType?: EntityType) => {
    if (vendor && entityType) {
      setCache((prev) => {
        const newCache = { ...prev };
        if (newCache[vendor]) {
          const vendorCache = { ...newCache[vendor] };
          delete vendorCache[entityType];
          newCache[vendor] = vendorCache;
        }
        return newCache;
      });
    } else if (vendor) {
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[vendor];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  return (
    <IntegrationsContext.Provider
      value={{
        cache,
        fetchEntityData,
        getCachedData,
        refreshVendor,
        clearCache,
        isLoading,
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrationsContext() {
  const context = useContext(IntegrationsContext);
  if (context === undefined) {
    throw new Error("useIntegrationsContext must be used within IntegrationsProvider");
  }
  return context;
}
