import { useState, useEffect, useCallback } from "react";
import { IntegrationLayout } from "@/components/integration-layout";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { MessageCard } from "@/components/connectors/message-card";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import type { SlackMessageEntity } from "@ait/core";

export default function SlackPage() {
  const { fetchEntityData, refreshVendor, getCachedData } = useIntegrationsContext();
  const [messages, setMessages] = useState<SlackMessageEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const cached = getCachedData("slack", "message");
        if (cached && page === 1) {
          setMessages(cached.data as SlackMessageEntity[]);
          setTotalPages(cached.pagination.totalPages);
          setIsLoading(false);
          return;
        }

        const response = await fetchEntityData("slack", "message", { page, limit: pageSize });
        setMessages(response.data as SlackMessageEntity[]);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        console.error("Failed to fetch Slack data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEntityData, getCachedData],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVendor("slack");
      await fetchData(currentPage);
    } catch (error) {
      console.error("Failed to refresh Slack data:", error);
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
      title="Slack"
      description="Channel updates"
      color="#4A154B"
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        {isLoading ? (
          <LoadingGrid count={12} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {messages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center py-8">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">No messages found</p>
                <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Slack account</p>
              </div>
            )}
          </>
        )}
      </div>
    </IntegrationLayout>
  );
}
