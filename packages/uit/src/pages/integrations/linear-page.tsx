import { useState, useEffect, useCallback } from "react";
import { IntegrationLayout } from "@/components/integration-layout";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { IssueCard } from "@/components/connectors/issue-card";
import { linearService } from "@/services";
import type { LinearIssueEntity as LinearIssue } from "@ait/core";

export default function LinearPage() {
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const response = await linearService.getIssues({ page, limit: pageSize });
      setIssues(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Failed to fetch Linear data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await linearService.refresh();
      await fetchData(currentPage);
    } catch (error) {
      console.error("Failed to refresh Linear data:", error);
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
