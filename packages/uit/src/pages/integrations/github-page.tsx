import { useState, useEffect, useCallback } from "react";
import { IntegrationLayout } from "@/components/integration-layout";
import { IntegrationTabs } from "@/components/integration-tabs";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { RepositoryCard } from "@/components/connectors/repository-card";
import { PullRequestCard } from "@/components/connectors/pull-request-card";
import { githubService } from "@/services";
import type { GitHubRepository, GitHubPullRequest } from "@/services/types";

type TabId = "repositories" | "pull-requests";

export default function GitHubPage() {
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
          const response = await githubService.getRepositories({ page, limit: pageSize });
          setRepositories(response.data);
          setTotalPages(response.pagination.totalPages);
          setTotalRepositories(response.pagination.total);
        } else {
          const response = await githubService.getPullRequests({ page, limit: pageSize });
          setPullRequests(response.data);
          setTotalPages(response.pagination.totalPages);
          setTotalPullRequests(response.pagination.total);
        }
      } catch (error) {
        console.error("Failed to fetch GitHub data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await githubService.refresh();
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
