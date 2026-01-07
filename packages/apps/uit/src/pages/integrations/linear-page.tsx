import { IssueCard } from "@/components/connectors/issue-card";
import { IntegrationLayout } from "@/components/integration-layout";
import { LoadingGrid } from "@/components/loading-grid";
import { Pagination } from "@/components/pagination";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { getLogger } from "@ait/core";
import type { LinearIssueEntity as LinearIssue } from "@ait/core";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

export default function LinearPage() {
  const { fetchEntityData, refreshVendor } = useIntegrationsContext();
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const response = await fetchEntityData("linear", "linear_issue", { page, limit: pageSize });
        setIssues(response.data as LinearIssue[]);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        logger.error("Failed to fetch Linear data:", { error });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEntityData],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVendor("linear");
      await fetchData(currentPage);
    } catch (error) {
      logger.error("Failed to refresh Linear data:", { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  return (
    <IntegrationLayout
      vendor="linear"
      title="Linear"
      description="Assigned issues"
      color="#5e6ad2"
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        {isLoading ? (
          <LoadingGrid count={12} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center py-8">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}

            {issues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">No issues found</p>
                <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Linear account</p>
              </div>
            )}
          </>
        )}
      </div>
    </IntegrationLayout>
  );
}
