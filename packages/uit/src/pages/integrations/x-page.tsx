import { useState, useEffect, useCallback } from "react";
import { getLogger } from "@ait/core";
import { IntegrationLayout } from "@/components/integration-layout";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { TweetCard } from "@/components/connectors/tweet-card";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import type { XTweetEntity as XTweet } from "@ait/core";

const logger = getLogger();

export default function XPage() {
  const { fetchEntityData, refreshVendor } = useIntegrationsContext();
  const [tweets, setTweets] = useState<XTweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const response = await fetchEntityData("x", "tweet", { page, limit: pageSize });
        setTweets(response.data as XTweet[]);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        logger.error("Failed to fetch X data:", { error });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEntityData],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVendor("x");
      await fetchData(currentPage);
    } catch (error) {
      logger.error("Failed to refresh X data:", { error });
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
      title="X (Twitter)"
      description="Latest tweets"
      color="#14171A"
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        {isLoading ? (
          <LoadingGrid count={12} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center py-8">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}

            {tweets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">No tweets found</p>
                <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your X account</p>
              </div>
            )}
          </>
        )}
      </div>
    </IntegrationLayout>
  );
}
