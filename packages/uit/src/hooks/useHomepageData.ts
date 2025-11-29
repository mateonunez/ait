import { useEffect, useState, useMemo, useRef } from "react";
import { getLogger, getEntityMetadata, type EntityType } from "@ait/core";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { contentAlgorithmService } from "@/services/content-algorithm.service";
import type { IntegrationEntity, HomeSection as HomeSectionType } from "@/types/integrations.types";

const logger = getLogger();

const DAYS_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_DAYS = 30; // Only show calendar events within 30 days
const MAX_PAST_DAYS = 7; // Show events from the past week

function isCalendarEventRelevant(entity: IntegrationEntity): boolean {
  const entityAny = entity as any;
  if (entityAny.__type !== "event") return true;

  if (!entityAny.startTime) return false;

  const startTime = new Date(entityAny.startTime);
  const now = new Date();

  // Normalize recurring events to current/next year
  let normalizedStart = startTime;
  const yearsDiff = Math.abs(startTime.getFullYear() - now.getFullYear());
  if (yearsDiff > 1) {
    normalizedStart = new Date(startTime);
    normalizedStart.setFullYear(now.getFullYear());
    if (normalizedStart < now) {
      normalizedStart.setFullYear(now.getFullYear() + 1);
    }
  }

  const diffMs = normalizedStart.getTime() - now.getTime();
  const diffDays = diffMs / DAYS_MS;

  // Only include events within the relevant window
  return diffDays >= -MAX_PAST_DAYS && diffDays <= MAX_FUTURE_DAYS;
}

function deduplicateRecurringEvents(items: IntegrationEntity[]): IntegrationEntity[] {
  const seenRecurring = new Set<string>();
  const seenTitles = new Set<string>();

  return items.filter((item) => {
    const entityAny = item as any;
    if (entityAny.__type !== "event") return true;

    // Dedupe by recurringEventId (same recurring series)
    if (entityAny.recurringEventId) {
      if (seenRecurring.has(entityAny.recurringEventId)) return false;
      seenRecurring.add(entityAny.recurringEventId);
      return true;
    }

    // Also dedupe by title for events without recurringEventId but same name
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

  if (entityAny.createdAt) return new Date(entityAny.createdAt);
  if (entityAny.updatedAt) return new Date(entityAny.updatedAt);
  if (entityAny.addedAt) return new Date(entityAny.addedAt);
  if (entityAny.pushedAt) return new Date(entityAny.pushedAt);
  if (entityAny.prUpdatedAt) return new Date(entityAny.prUpdatedAt);
  if (entityAny.playedAt) return new Date(entityAny.playedAt);
  if (entityAny.authorDate) return new Date(entityAny.authorDate);
  if (entityAny.committerDate) return new Date(entityAny.committerDate);
  if (entityAny.startTime) return new Date(entityAny.startTime);

  return null;
}

export interface UseHomepageDataOptions {
  sections: HomeSectionType[];
}

export interface UseHomepageDataReturn {
  sectionsData: Map<string, IntegrationEntity[]>;
  isLoading: boolean;
  totalItems: number;
}

export function useHomepageData({ sections }: UseHomepageDataOptions): UseHomepageDataReturn {
  const { fetchEntityData, getCachedData } = useIntegrationsContext();
  const [sectionsData, setSectionsData] = useState<Map<string, IntegrationEntity[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current || isLoadingRef.current) return;

    const loadHomepageData = async () => {
      isLoadingRef.current = true;
      setIsLoading(true);
      const newSectionsData = new Map<string, IntegrationEntity[]>();

      try {
        const entityTypeLimits = new Map<string, number>();

        for (const section of sections) {
          for (const entityType of section.entityTypes) {
            const currentLimit = entityTypeLimits.get(entityType) || 0;
            const sectionLimit = section.id === "recent" ? 10 : section.entityTypes.length === 1 ? 15 : 10;

            entityTypeLimits.set(entityType, Math.max(currentLimit, sectionLimit));
          }
        }

        const fetchedData = new Map<string, IntegrationEntity[]>();

        for (const [entityType, limit] of entityTypeLimits.entries()) {
          try {
            const metadata = getEntityMetadata(entityType as EntityType);

            const cached = getCachedData(metadata.vendor, entityType as EntityType);
            if (cached && cached.data.length >= limit) {
              fetchedData.set(entityType, cached.data.slice(0, limit));
            } else {
              const response = await fetchEntityData(metadata.vendor, entityType as EntityType, {
                page: 1,
                limit,
              });
              fetchedData.set(entityType, response.data);
            }
          } catch (error) {
            logger.error(`Failed to fetch ${entityType}:`, { error });
          }
        }

        for (const section of sections) {
          if (section.id === "recent") {
            const allRecentItems: IntegrationEntity[] = [];

            for (const entityType of section.entityTypes) {
              const data = fetchedData.get(entityType);
              if (data) {
                allRecentItems.push(...data);
              }
            }

            // Filter, dedupe recurring events, then sort by date
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
              .sort((a, b) => {
                const timeA = a.timestamp!.getTime();
                const timeB = b.timestamp!.getTime();
                return timeB - timeA;
              });

            // Apply diversity: limit max items per entity type to ensure mixed content
            const maxPerType = 3;
            const typeCounts = new Map<string, number>();
            const diverseItems: IntegrationEntity[] = [];

            for (const { item, entityType } of sortedByDate) {
              const count = typeCounts.get(entityType) || 0;
              if (count < maxPerType) {
                diverseItems.push(item);
                typeCounts.set(entityType, count + 1);
              }
              // Stop when we have enough items
              if (diverseItems.length >= 10) break;
            }

            // If we don't have 10 items yet, fill with remaining items
            if (diverseItems.length < 10) {
              for (const { item } of sortedByDate) {
                if (!diverseItems.includes(item)) {
                  diverseItems.push(item);
                  if (diverseItems.length >= 10) break;
                }
              }
            }

            newSectionsData.set("recent", diverseItems);
          } else {
            const sectionItems: IntegrationEntity[] = [];

            for (const entityType of section.entityTypes) {
              const data = fetchedData.get(entityType);
              if (data) {
                const selectCount = section.entityTypes.length === 1 ? 6 : 3;
                const selected = contentAlgorithmService.selectItems(data, selectCount);
                sectionItems.push(...selected);
              }
            }

            const shuffled = contentAlgorithmService.shuffle(sectionItems);
            const limited = shuffled.slice(0, 10);
            newSectionsData.set(section.id, limited);
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
    };

    loadHomepageData();
  }, [sections, fetchEntityData, getCachedData]);

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
  };
}
