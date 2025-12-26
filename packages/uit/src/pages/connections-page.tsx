import { ConnectionCard } from "@/components/connections/connection-card";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { connectionsService } from "@/services/connections.service";
import { type IntegrationVendor, SUPPORTED_VENDORS } from "@ait/core";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ConnectionsPage() {
  const { status, isLoading, refetch, disconnect, isExpiringSoon } = useConnectionStatus();
  const [connectingVendor, setConnectingVendor] = useState<IntegrationVendor | null>(null);
  const [disconnectingVendor, setDisconnectingVendor] = useState<IntegrationVendor | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
      }
    };
  }, []);

  const handleConnect = useCallback(
    (vendor: IntegrationVendor) => {
      setConnectingVendor(vendor);

      // Open OAuth in a popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      popupRef.current = window.open(
        connectionsService.getAuthUrl(vendor),
        `${vendor}_oauth`,
        `width=${width},height=${height},left=${left},top=${top},popup=yes`,
      );

      // Check if popup was blocked
      if (!popupRef.current) {
        // Fallback to redirect if popup blocked
        window.location.href = connectionsService.getAuthUrl(vendor);
        return;
      }

      // Poll for popup close (indicates auth complete or cancelled)
      popupCheckInterval.current = setInterval(() => {
        if (popupRef.current?.closed) {
          if (popupCheckInterval.current) {
            clearInterval(popupCheckInterval.current);
            popupCheckInterval.current = null;
          }
          // Refresh status after popup closes
          refetch();
          setConnectingVendor(null);
        }
      }, 500);
    },
    [refetch],
  );

  const handleDisconnect = useCallback(
    async (vendor: IntegrationVendor) => {
      setDisconnectingVendor(vendor);
      await disconnect(vendor);
      setDisconnectingVendor(null);
    },
    [disconnect],
  );

  const connectedCount = SUPPORTED_VENDORS.filter((v) => status?.[v]?.connected).length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Compact header with stats and refresh */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-sm text-muted-foreground">
          {connectedCount} of {SUPPORTED_VENDORS.length} integrations connected
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <main className="container mx-auto py-6 px-3 sm:px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORTED_VENDORS.map((vendor) => (
            <ConnectionCard
              key={vendor}
              vendor={vendor}
              status={status?.[vendor as IntegrationVendor] ?? null}
              isLoading={isLoading || disconnectingVendor === vendor || connectingVendor === vendor}
              isExpiringSoon={isExpiringSoon(vendor as IntegrationVendor)}
              onConnect={() => handleConnect(vendor)}
              onDisconnect={() => handleDisconnect(vendor)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
