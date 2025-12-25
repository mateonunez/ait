import { ConnectionCard } from "@/components/connections/connection-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { connectionsService } from "@/services/connections.service";
import { type IntegrationVendor, SUPPORTED_VENDORS } from "@ait/core";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ConnectionsPage() {
  const [, setLocation] = useLocation();
  const { status, isLoading, refetch, disconnect, isExpiringSoon } = useConnectionStatus();
  const [disconnectingVendor, setDisconnectingVendor] = useState<string | null>(null);

  const handleConnect = (vendor: IntegrationVendor) => {
    window.location.href = connectionsService.getAuthUrl(vendor);
  };

  const handleDisconnect = async (vendor: IntegrationVendor) => {
    setDisconnectingVendor(vendor);
    await disconnect(vendor);
    setDisconnectingVendor(null);
  };

  const connectedCount = SUPPORTED_VENDORS.filter((v) => status?.[v]?.connected).length;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1.5 sm:gap-2 px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold leading-tight">Connections</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {connectedCount} of {SUPPORTED_VENDORS.length} integrations connected
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-1.5 sm:gap-2 px-2 sm:px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto py-6 px-3 sm:px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORTED_VENDORS.map((vendor) => (
            <ConnectionCard
              key={vendor}
              vendor={vendor}
              status={status?.[vendor as IntegrationVendor] ?? null}
              isLoading={isLoading || disconnectingVendor === vendor}
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
