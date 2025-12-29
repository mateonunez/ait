import { contentAlgorithmService } from "@/services/content-algorithm.service";
import { fetchDiscoveryFeed } from "@/services/discovery.service";
import type { HomeSection as HomeSectionType, IntegrationEntity } from "@/types/integrations.types";
import { type EntityType, type FeedRequirement, getEntityMetadata, getLogger } from "@ait/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const logger = getLogger();

const DAYS_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_DAYS = 30;
const MAX_PAST_DAYS = 7;

function isCalendarEventRelevant(entity: IntegrationEntity): boolean {
  const entityAny = entity as any;
  if (entityAny.__type !== "event") return true;
  if (!entityAny.startTime) return false;

  const startTime = new Date(entityAny.startTime);
  const now = new Date();

  // Normalize for recurring events or past events that are still relevant
  const normalizedStart = new Date(startTime);
  const diffDays = (normalizedStart.getTime() - now.getTime()) / DAYS_MS;

  // If it's a past event, check if it's within the past 7 days
  // If it's a future event, check if it's within the next 30 days
  return diffDays >= -MAX_PAST_DAYS && diffDays <= MAX_FUTURE_DAYS;
}

function deduplicateRecurringEvents(items: IntegrationEntity[]): IntegrationEntity[] {
  const seenRecurring = new Set<string>();
  const seenTitles = new Set<string>();

  return items.filter((item) => {
    const entityAny = item as any;
    if (entityAny.__type !== "event") return true;
    if (entityAny.recurringEventId) {
      if (seenRecurring.has(entityAny.recurringEventId)) return false;
      seenRecurring.add(entityAny.recurringEventId);
      return true;
    }
    const title = entityAny.title?.toLowerCase().trim();
    if (title) {
      if (seenTitles.has(title)) return false;
      seenTitles.add(title);
    }
    return true;
  });
}

function getEntityTimestamp(entity: IntegrationEntity): Date | null {
  const entityAny = entity as any;
  const fields = [
    "playedAt",
    "startTime",
    "createdAt",
    "updatedAt",
    "pushedAt",
    "prUpdatedAt",
    "addedAt",
    "authorDate",
    "committerDate",
  ];
  for (const field of fields) {
    if (entityAny[field]) return new Date(entityAny[field]);
  }
  return null;
}

export interface UseHomepageDataOptions {
  sections: HomeSectionType[];
  /** Whether to lazy load sections as they appear (logic to be implemented in component) */
  lazyLoad?: boolean;
}

export interface UseHomepageDataReturn {
  sectionsData: Map<string, IntegrationEntity[]>;
  isLoading: boolean;
  totalItems: number;
  refetch: (options?: { skipCache?: boolean }) => Promise<void>;
}

export function useHomepageData({ sections, lazyLoad = false }: UseHomepageDataOptions): UseHomepageDataReturn {
  const [sectionsData, setSectionsData] = useState<Map<string, IntegrationEntity[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadHomepageData = useCallback(
    async (options: { skipCache?: boolean } = {}) => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      const newSectionsData = new Map<string, IntegrationEntity[]>();

      try {
        const entityTypeLimits = new Map<string, number>();
        for (const section of sections) {
          for (const entityType of section.entityTypes) {
            const currentLimit = entityTypeLimits.get(entityType) || 0;
            const sectionLimit = section.id === "recent" ? 15 : section.entityTypes.length === 1 ? 15 : 10;
            entityTypeLimits.set(entityType, Math.max(currentLimit, sectionLimit));
          }
        }

        const requirements: FeedRequirement[] = Array.from(entityTypeLimits.entries()).map(([entityType, limit]) => ({
          entityType: entityType as EntityType,
          limit,
          vendor: getEntityMetadata(entityType as EntityType).vendor,
        }));

        logger.info("[useHomepageData] Fetching bulk feed", {
          entityTypes: requirements.length,
          skipCache: options.skipCache,
        });

        const fetchedDataMap = await fetchDiscoveryFeed(requirements, { skipCache: options.skipCache });
        const fetchedData = new Map<string, IntegrationEntity[]>(Object.entries(fetchedDataMap));

        for (const section of sections) {
          if (section.id === "recent") {
            const allRecentItems: IntegrationEntity[] = [];
            for (const entityType of section.entityTypes) {
              const data = fetchedData.get(entityType);
              if (data) allRecentItems.push(...data);
            }

            const relevantItems = deduplicateRecurringEvents(
              allRecentItems.filter((item) => isCalendarEventRelevant(item)),
            );

            const sortedByDate = relevantItems
              .map((item) => ({
                item,
                timestamp: getEntityTimestamp(item),
                entityType: (item as any).__type as string,
              }))
              .filter(({ timestamp }) => timestamp !== null)
              .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());

            const maxPerType = 4;
            const typeCounts = new Map<string, number>();
            const diverseItems: IntegrationEntity[] = [];

            for (const { item, entityType } of sortedByDate) {
              const count = typeCounts.get(entityType) || 0;
              if (count < maxPerType) {
                diverseItems.push(item);
                typeCounts.set(entityType, count + 1);
              }
              if (diverseItems.length >= 12) break;
            }

            if (diverseItems.length < 12) {
              for (const { item } of sortedByDate) {
                if (!diverseItems.includes(item)) {
                  diverseItems.push(item);
                  if (diverseItems.length >= 12) break;
                }
              }
            }
            newSectionsData.set("recent", diverseItems);
          } else {
            const sectionItems: IntegrationEntity[] = [];
            for (const entityType of section.entityTypes) {
              const data = fetchedData.get(entityType);
              if (data) {
                const selectCount = section.entityTypes.length === 1 ? 8 : 4;
                const selected = contentAlgorithmService.selectItems(data, selectCount);
                sectionItems.push(...selected);
              }
            }
            const shuffled = contentAlgorithmService.shuffle(sectionItems);
            newSectionsData.set(section.id, shuffled.slice(0, 10));
          }
        }

        setSectionsData(newSectionsData);
        hasLoadedRef.current = true;
      } catch (error) {
        logger.error("Failed to load homepage data:", { error });
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [sections],
  );

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (lazyLoad) {
      logger.debug("[useHomepageData] Lazy loading enabled for initial fetch");
    }
    loadHomepageData();
  }, [loadHomepageData, lazyLoad]);

  const totalItems = useMemo(() => {
    let count = 0;
    for (const items of sectionsData.values()) {
      count += items.length;
    }
    return count;
  }, [sectionsData]);

  return {
    sectionsData,
    isLoading,
    totalItems,
    refetch: loadHomepageData,
  };
}
