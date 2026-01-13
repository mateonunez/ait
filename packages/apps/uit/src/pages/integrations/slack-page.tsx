import { MessageCard } from "@/components/connectors/message-card";
import { IntegrationLayout } from "@/components/integration-layout";
import { LoadingGrid } from "@/components/loading-grid";
import { Pagination } from "@/components/pagination";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { getLogger } from "@ait/core";
import type { SlackMessageEntity } from "@ait/core";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

export default function SlackPage() {
  const { fetchEntityData, refreshVendor, clearCache } = useIntegrationsContext();
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
        const response = await fetchEntityData("slack", "slack_message", { page, limit: pageSize });
        setMessages(response.data as SlackMessageEntity[]);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        logger.error("Failed to fetch Slack data:", { error });
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
        const { slackService } = await import("@/services/slack.service");
        await slackService.refresh(entitiesToRefresh);
        clearCache("slack");
      } else {
        await refreshVendor("slack");
      }

      await fetchData(currentPage);
    } catch (error) {
      logger.error("Failed to refresh Slack data:", { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  const availableEntities = [{ id: "messages", label: "Messages" }];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  return (
    <IntegrationLayout
      vendor="slack"
      title="Slack"
      description="Channel updates"
      color="#4A154B"
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
