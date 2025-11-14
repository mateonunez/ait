import { useEffect, useState, useMemo, useRef } from "react";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { contentAlgorithmService } from "@/services/content-algorithm.service";
import type { IntegrationEntity, HomeSection as HomeSectionType } from "@/types/integrations.types";
import { getEntityMetadata, type EntityType } from "@ait/core";

function getEntityTimestamp(entity: IntegrationEntity): Date | null {
  const entityAny = entity as any;

  if (entityAny.createdAt) return new Date(entityAny.createdAt);
  if (entityAny.updatedAt) return new Date(entityAny.updatedAt);
  if (entityAny.addedAt) return new Date(entityAny.addedAt);
  if (entityAny.pushedAt) return new Date(entityAny.pushedAt);
  if (entityAny.prUpdatedAt) return new Date(entityAny.prUpdatedAt);
  if (entityAny.playedAt) return new Date(entityAny.playedAt);

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
            console.error(`Failed to fetch ${entityType}:`, error);
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

            const sortedByDate = allRecentItems
              .map((item) => ({
                item,
                timestamp: getEntityTimestamp(item),
              }))
              .filter(({ timestamp }) => timestamp !== null)
              .sort((a, b) => {
                const timeA = a.timestamp!.getTime();
                const timeB = b.timestamp!.getTime();
                return timeB - timeA;
              })
              .map(({ item }) => item)
              .slice(0, 10);

            newSectionsData.set("recent", sortedByDate);
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
        console.error("Failed to load homepage data:", error);
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
