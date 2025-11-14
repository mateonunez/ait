import { useState, useEffect, useCallback } from "react";
import { IntegrationLayout } from "@/components/integration-layout";
import { IntegrationTabs } from "@/components/integration-tabs";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { RepositoryCard } from "@/components/connectors/repository-card";
import { PullRequestCard } from "@/components/connectors/pull-request-card";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import type {
  GitHubRepositoryEntity as GitHubRepository,
  GitHubPullRequestEntity as GitHubPullRequest,
} from "@ait/core";

type TabId = "repositories" | "pull-requests";

export default function GitHubPage() {
  const { fetchEntityData, refreshVendor, getCachedData } = useIntegrationsContext();
  const [activeTab, setActiveTab] = useState<TabId>("repositories");
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRepositories, setTotalRepositories] = useState(0);
  const [totalPullRequests, setTotalPullRequests] = useState(0);
  const pageSize = 50;

  const fetchData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        if (activeTab === "repositories") {
          const cached = getCachedData("github", "repository");
          if (cached && page === 1) {
            setRepositories(cached.data as GitHubRepository[]);
            setTotalPages(cached.pagination.totalPages);
            setTotalRepositories(cached.pagination.total);
            setIsLoading(false);
            return;
          }

          const response = await fetchEntityData("github", "repository", { page, limit: pageSize });
          setRepositories(response.data as GitHubRepository[]);
          setTotalPages(response.pagination.totalPages);
          setTotalRepositories(response.pagination.total);
        } else {
          const cached = getCachedData("github", "pull_request");
          if (cached && page === 1) {
            setPullRequests(cached.data as GitHubPullRequest[]);
            setTotalPages(cached.pagination.totalPages);
            setTotalPullRequests(cached.pagination.total);
            setIsLoading(false);
            return;
          }

          const response = await fetchEntityData("github", "pull_request", { page, limit: pageSize });
          setPullRequests(response.data as GitHubPullRequest[]);
          setTotalPages(response.pagination.totalPages);
          setTotalPullRequests(response.pagination.total);
        }
      } catch (error) {
        console.error("Failed to fetch GitHub data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, fetchEntityData, getCachedData],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVendor("github");
      await fetchData(currentPage);
    } catch (error) {
      console.error("Failed to refresh GitHub data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabId);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const tabs = [
    { id: "repositories", label: "Repositories", count: totalRepositories },
    { id: "pull-requests", label: "Pull Requests", count: totalPullRequests },
  ];

  return (
    <IntegrationLayout
      title="GitHub"
      description="Recent activity and repositories"
      color="#1A1E22"
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        <IntegrationTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

        {isLoading ? (
          <LoadingGrid count={12} />
        ) : (
          <>
            {activeTab === "repositories" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {repositories.map((repo) => (
                  <RepositoryCard key={repo.id} repository={repo} />
                ))}
              </div>
            )}

            {activeTab === "pull-requests" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pullRequests.map((pr) => (
                  <PullRequestCard key={pr.id} pullRequest={pr} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center py-8">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}

            {((activeTab === "repositories" && repositories.length === 0) ||
              (activeTab === "pull-requests" && pullRequests.length === 0)) && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">No data found</p>
                <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your GitHub account</p>
              </div>
            )}
          </>
        )}
      </div>
    </IntegrationLayout>
  );
}
