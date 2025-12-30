import { CalendarCard } from "@/components/connectors/calendar-card";
import { EventCard } from "@/components/connectors/event-card";
import { GoogleContactCard } from "@/components/connectors/google-contact-card";
import { GooglePhotoCard } from "@/components/connectors/google-photo-card";
import { GoogleYouTubeSubscriptionCard } from "@/components/connectors/google-youtube-subscription-card";
import { IntegrationLayout } from "@/components/integration-layout";
import { IntegrationTabs } from "@/components/integration-tabs";
import { LoadingGrid } from "@/components/loading-grid";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import {
  type GoogleCalendarCalendarEntity,
  type GoogleCalendarEventEntity,
  type GoogleContactEntity,
  type GooglePhotoEntity,
  type GoogleYouTubeSubscriptionEntity,
  getLogger,
  requestJson,
} from "@ait/core";
import { Calendar, Image as ImageIcon, Upload, User, Youtube } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

const TABS = [
  { id: "events", label: "Events" },
  { id: "calendars", label: "Calendars" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "contacts", label: "Contacts" },
  { id: "photos", label: "Photos" },
];

export default function GooglePage() {
  const { fetchEntityData, clearCache } = useIntegrationsContext();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    return tab && TABS.some((t) => t.id === tab) ? tab : "events";
  });
  const [events, setEvents] = useState<GoogleCalendarEventEntity[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendarCalendarEntity[]>([]);
  const [subscriptions, setSubscriptions] = useState<GoogleYouTubeSubscriptionEntity[]>([]);
  const [contacts, setContacts] = useState<GoogleContactEntity[]>([]);
  const [photos, setPhotos] = useState<GooglePhotoEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(
    async (tab: string, page: number) => {
      setIsLoading(true);
      try {
        if (tab === "events") {
          const response = await fetchEntityData("google", "google_calendar_event", { page, limit: pageSize });
          setEvents(response.data as GoogleCalendarEventEntity[]);
          setTotalPages(response.pagination.totalPages);
        } else if (tab === "calendars") {
          const response = await fetchEntityData("google", "google_calendar_calendar", { page, limit: pageSize });
          setCalendars(response.data as GoogleCalendarCalendarEntity[]);
          setTotalPages(response.pagination.totalPages);
        } else if (tab === "subscriptions") {
          const response = await fetchEntityData("google", "google_youtube_subscription", { page, limit: pageSize });
          setSubscriptions(response.data as GoogleYouTubeSubscriptionEntity[]);
          setTotalPages(response.pagination.totalPages);
        } else if (tab === "contacts") {
          const response = await fetchEntityData("google", "google_contact", { page, limit: pageSize });
          setContacts(response.data as GoogleContactEntity[]);
          setTotalPages(response.pagination.totalPages);
        } else if (tab === "photos") {
          const response = await fetchEntityData("google", "google_photo", { page, limit: pageSize });
          setPhotos(response.data as GooglePhotoEntity[]);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        logger.error("Failed to fetch Google data:", { error });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEntityData],
  );

  // Map tab IDs to API entity names for refresh
  const tabToEntityMap: Record<string, string> = {
    events: "events",
    calendars: "calendars",
    subscriptions: "subscriptions",
    contacts: "contacts",
    photos: "photos",
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Only refresh the current tab's entity for faster response
      const entity = tabToEntityMap[activeTab];
      await requestJson(`/api/google/refresh?entities=${entity}`, { method: "POST" });

      // Clear cache to ensure fresh data is fetched
      const entityTypeMap: Record<string, string> = {
        events: "google_calendar_event",
        calendars: "google_calendar_calendar",
        subscriptions: "google_youtube_subscription",
        contacts: "google_contact",
        photos: "google_photo",
      };
      clearCache("google", entityTypeMap[activeTab] as any);
      await fetchData(activeTab, currentPage);
    } catch (error) {
      logger.error("Failed to refresh Google data:", { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImportPhotos = async () => {
    setIsImporting(true);
    try {
      const sessionResult = await requestJson<{ pickerUri: string; id: string }>("/api/google/photos/picker/session", {
        method: "POST",
      });
      if (!sessionResult.ok) throw new Error("Failed to create session");
      const { pickerUri, id: sessionId } = sessionResult.value.data;
      console.log("[Picker] Session created:", sessionId);

      const pickerUrl = `${pickerUri}/autoclose`;
      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        pickerUrl,
        "Google Photos Picker",
        `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars`,
      );
      console.log("[Picker] Opened picker with URL:", pickerUrl);

      let pollsAfterWindowClosed = 0;
      const pollInterval = setInterval(async () => {
        try {
          const statusResult = await requestJson<{ mediaItemsSet: boolean }>(
            `/api/google/photos/picker/session/${sessionId}`,
          );
          if (statusResult.ok) {
            const statusData = statusResult.value.data;
            console.log("[Picker] Poll status:", statusData.mediaItemsSet, "windowClosed:", popup?.closed);

            if (statusData.mediaItemsSet) {
              console.log("[Picker] mediaItemsSet is true! Importing...");
              clearInterval(pollInterval);
              popup?.close();

              const importResult = await requestJson<{ success: boolean; count: number }>(
                `/api/google/photos/picker/import/${sessionId}`,
                { method: "POST" },
              );
              console.log("[Picker] Import result:", importResult.ok ? importResult.value.data : "failed");

              // Force sync photos from the backend after import
              console.log("[Picker] Syncing photos...");
              await requestJson("/api/google/refresh?entities=photos", { method: "POST" });

              // Clear the photos cache to ensure fresh data is fetched
              clearCache("google", "google_photo");
              await fetchData("photos", 1);
              setIsImporting(false);
              return;
            }
          }
        } catch (error) {
          logger.error("Polling error", { error });
        }

        if (popup?.closed) {
          pollsAfterWindowClosed++;
          console.log("[Picker] Window closed, grace period poll:", pollsAfterWindowClosed);

          if (pollsAfterWindowClosed > 10) {
            console.log("[Picker] Grace period expired, stopping poll.");
            clearInterval(pollInterval);
            setIsImporting(false);
          }
        }
      }, 1000);
    } catch (error) {
      logger.error("Failed to start import flow:", { error });
      setIsImporting(false);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && tab !== activeTab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [activeTab]);

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

    if (activeTab === "subscriptions") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((subscription) => (
              <GoogleYouTubeSubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center py-8">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}

          {subscriptions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Youtube className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No subscriptions found</p>
              <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Google account</p>
            </div>
          )}
        </>
      );
    }

    if (activeTab === "contacts") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <GoogleContactCard key={contact.id} contact={contact} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center py-8">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}

          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No contacts found</p>
              <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Google account</p>
            </div>
          )}
        </>
      );
    }

    if (activeTab === "photos") {
      return (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={handleImportPhotos} disabled={isImporting || isRefreshing} variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? "Importing..." : "Import Photos"}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <GooglePhotoCard key={photo.id} photo={photo} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center py-8">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}

          {photos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No photos found</p>
              <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Google account</p>
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
      description="Calendar events, YouTube subscriptions, Contacts, and Photos"
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
