import { PageCard } from "@/components/connectors/page-card";
import { IntegrationLayout } from "@/components/integration-layout";
import { LoadingGrid } from "@/components/loading-grid";
import { Pagination } from "@/components/pagination";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { getLogger } from "@ait/core";
import type { NotionPageEntity } from "@ait/core";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

export default function NotionPage() {
  const { fetchEntityData, refreshVendor, clearCache } = useIntegrationsContext();
  const [pages, setPages] = useState<NotionPageEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const response = await fetchEntityData("notion", "notion_page", { page, limit: pageSize });
        setPages(response.data as NotionPageEntity[]);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        logger.error("Failed to fetch Notion data:", { error });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEntityData],
  );

  const handleRefresh = async (selectedIds?: string[]) => {
    setIsRefreshing(true);
    try {
      const entitiesToRefresh = selectedIds && selectedIds.length > 0 ? selectedIds : undefined;

      if (entitiesToRefresh) {
        const { notionService } = await import("@/services/notion.service");
        await notionService.refresh(entitiesToRefresh);
        clearCache("notion");
      } else {
        await refreshVendor("notion");
      }

      await fetchData(currentPage);
    } catch (error) {
      logger.error("Failed to refresh Notion data:", { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  const availableEntities = [{ id: "pages", label: "Pages" }];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  return (
    <IntegrationLayout
      vendor="notion"
      title="Notion"
      description="Recent documents and updates"
      color="#000000"
      onRefresh={handleRefresh}
      availableEntities={availableEntities}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        {isLoading ? (
          <LoadingGrid count={12} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <PageCard key={page.id} page={page} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center py-8">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}

            {pages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">No pages found</p>
                <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Notion account</p>
              </div>
            )}
          </>
        )}
      </div>
    </IntegrationLayout>
  );
}
