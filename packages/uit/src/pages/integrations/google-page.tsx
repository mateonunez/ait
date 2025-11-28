import { useState, useEffect, useCallback } from "react";
import { IntegrationLayout } from "@/components/integration-layout";
import { IntegrationTabs } from "@/components/integration-tabs";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { EventCard } from "@/components/connectors/event-card";
import { CalendarCard } from "@/components/connectors/calendar-card";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import type { GoogleCalendarEventEntity, GoogleCalendarCalendarEntity } from "@ait/core";
import { Calendar } from "lucide-react";

const TABS = [
  { id: "events", label: "Events" },
  { id: "calendars", label: "Calendars" },
];

export default function GooglePage() {
  const { fetchEntityData, refreshVendor } = useIntegrationsContext();
  const [activeTab, setActiveTab] = useState("events");
  const [events, setEvents] = useState<GoogleCalendarEventEntity[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendarCalendarEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(
    async (tab: string, page: number) => {
      setIsLoading(true);
      try {
        if (tab === "events") {
          const response = await fetchEntityData("google", "event", { page, limit: pageSize });
          setEvents(response.data as GoogleCalendarEventEntity[]);
          setTotalPages(response.pagination.totalPages);
        } else if (tab === "calendars") {
          const response = await fetchEntityData("google", "calendar", { page, limit: pageSize });
          setCalendars(response.data as GoogleCalendarCalendarEntity[]);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error("Failed to fetch Google data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEntityData],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVendor("google");
      await fetchData(activeTab, currentPage);
    } catch (error) {
      console.error("Failed to refresh Google data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchData(activeTab, currentPage);
  }, [fetchData, activeTab, currentPage]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingGrid count={12} />;
    }

    if (activeTab === "events") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center py-8">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}

          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No events found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try refreshing or connecting your Google Calendar account
              </p>
            </div>
          )}
        </>
      );
    }

    if (activeTab === "calendars") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calendars.map((calendar) => (
              <CalendarCard key={calendar.id} calendar={calendar} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center py-8">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}

          {calendars.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No calendars found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try refreshing or connecting your Google Calendar account
              </p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <IntegrationLayout
      title="Google"
      description="Calendar events and schedule"
      color="#4285F4"
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        <IntegrationTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
        {renderContent()}
      </div>
    </IntegrationLayout>
  );
}
