import { ConnectionCard } from "@/components/connections/connection-card";
import { ConnectorConfigModal } from "@/components/connections/connector-config-modal";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { type ConnectorConfig, type ConnectorProvider, connectionsService } from "@/services/connections.service";
import type { IntegrationVendor } from "@ait/core";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ConnectionsPage() {
  const { isLoading: isStatusLoading, refetch, disconnect, getConfigStatus, isExpiringSoon } = useConnectionStatus();

  const [providers, setProviders] = useState<ConnectorProvider[]>([]);
  const [configs, setConfigs] = useState<ConnectorConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProvider, setSelectedProvider] = useState<ConnectorProvider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [actioningId, setActioningId] = useState<string | null>(null);

  const popupRef = useRef<Window | null>(null);
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, c] = await Promise.all([connectionsService.getProviders(), connectionsService.getConfigs()]);
      setProviders(p);
      setConfigs(c);
    } catch (err) {
      console.error("Failed to fetch connections data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
      }
    };
  }, []);

  const initiateOAuth = useCallback(
    (vendor: IntegrationVendor, configId: string) => {
      setActioningId(configId);

      // Open OAuth in a popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authUrl = connectionsService.getAuthUrl(vendor, configId);

      popupRef.current = window.open(
        authUrl,
        `${vendor}_oauth_${configId}`,
        `width=${width},height=${height},left=${left},top=${top},popup=yes`,
      );

      // Check if popup was blocked
      if (!popupRef.current) {
        // Fallback to redirect if popup blocked
        window.location.href = authUrl;
        return;
      }

      // Poll for popup close (indicates auth complete or cancelled)
      popupCheckInterval.current = setInterval(() => {
        if (popupRef.current?.closed) {
          if (popupCheckInterval.current) {
            clearInterval(popupCheckInterval.current);
            popupCheckInterval.current = null;
          }
          // Refresh status and configs after popup closes
          refetch();
          fetchData();
          setActioningId(null);
        }
      }, 500);
    },
    [refetch, fetchData],
  );

  const handleConnectProvider = (provider: ConnectorProvider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  const handleModalClose = (configId?: string) => {
    setIsModalOpen(false);
    if (configId && selectedProvider) {
      // Configuration created, now initiate OAuth
      initiateOAuth(selectedProvider.slug, configId);
    }
    setSelectedProvider(null);
  };

  const handleDisconnect = useCallback(
    async (configId?: string) => {
      if (!configId) return;

      const config = configs.find((c) => c.id === configId);
      if (!config) return;

      setActioningId(configId);
      await disconnect(config.provider!.slug, configId);
      await fetchData();
      setActioningId(null);
    },
    [disconnect, configs, fetchData],
  );

  const handleRefresh = async () => {
    await Promise.all([refetch(), fetchData()]);
  };

  const isGlobalLoading = isLoading || isStatusLoading;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Compact header with stats and refresh */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-sm text-muted-foreground">Connect your apps to centralize your digital life.</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isGlobalLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isGlobalLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <main className="container mx-auto py-6 px-3 sm:px-4 md:px-6 space-y-8">
        {/* Active Connections */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            My Connections
            <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {configs.length}
            </span>
          </h2>

          {configs.length === 0 ? (
            <div className="border rounded-lg border-dashed p-8 text-center bg-muted/30">
              <p className="text-muted-foreground text-sm">
                No connections yet. Choose a provider below to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {configs.map((config) => (
                <ConnectionCard
                  key={config.id}
                  configId={config.id}
                  vendor={config.provider!.slug}
                  name={config.name}
                  status={getConfigStatus(config.id)}
                  isLoading={isGlobalLoading || actioningId === config.id}
                  isExpiringSoon={isExpiringSoon(config.id)}
                  onConnect={() => initiateOAuth(config.provider!.slug, config.id)}
                  onDisconnect={() => handleDisconnect(config.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Available Providers */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Available Providers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers
              .filter((p) => !configs.some((c) => c.providerId === p.id))
              .map((provider) => (
                <ConnectionCard
                  key={provider.id}
                  vendor={provider.slug}
                  name={provider.name}
                  status={null}
                  isProvider
                  isLoading={isGlobalLoading}
                  onConnect={() => handleConnectProvider(provider)}
                  onDisconnect={() => {}} // No disconnect for providers
                />
              ))}
          </div>
        </section>
      </main>

      <ConnectorConfigModal provider={selectedProvider} isOpen={isModalOpen} onClose={handleModalClose} />
    </div>
  );
}
