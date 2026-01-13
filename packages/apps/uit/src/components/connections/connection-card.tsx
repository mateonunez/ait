import type { ConnectionStatus } from "@/services/connections.service";
import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@ait/core";
import type { IntegrationVendor } from "@ait/core";
import { AlertTriangle, Ban, Box, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { VendorConnectButton } from "./vendor-connect-button";
import { VENDOR_COLORS, VENDOR_ICONS, VENDOR_NAMES } from "./vendor-icons";

interface ConnectionCardProps {
  vendor: IntegrationVendor;
  name?: string; // Custom name override
  configId?: string; // Specific configuration ID
  status: ConnectionStatus | null;
  isLoading?: boolean;
  isExpiringSoon?: boolean;
  onConnect?: () => void;
  onDisconnect: (configId?: string) => void;
  error?: string | null;
  className?: string;
  isProvider?: boolean; // If true, it's a provider to connect
}

export function ConnectionCard({
  vendor,
  name: customName,
  configId,
  status,
  isLoading = false,
  isExpiringSoon = false,
  onConnect,
  onDisconnect,
  error,
  className,
  isProvider = false,
}: ConnectionCardProps) {
  const Icon = VENDOR_ICONS[vendor] ?? Box;
  const colors = VENDOR_COLORS[vendor] ?? { bg: "#6B7280", text: "#FFFFFF", hover: "#4B5563" };
  const displayName = customName || VENDOR_NAMES[vendor] || vendor;

  const isConnected = status?.connected ?? false;
  const isGranted = status?.granted ?? true;

  // Loading skeleton
  if (isLoading && status === null) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Colored accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colors.bg ?? "" }} />

      <CardHeader className="flex flex-row items-center gap-4 pb-2 pt-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.bg ?? "" }}
        >
          <Icon className="h-5 w-5" style={{ color: colors.text ?? "" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base truncate">{displayName}</CardTitle>
            {!isProvider &&
              (isConnected ? (
                isGranted ? (
                  <Badge
                    variant="default"
                    className="gap-1 bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30 whitespace-nowrap"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                    <Ban className="h-3 w-3" />
                    Disabled
                  </Badge>
                )
              ) : (
                <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                  <XCircle className="h-3 w-3" />
                  Not connected
                </Badge>
              ))}
            {isProvider && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                Provider
              </Badge>
            )}
          </div>

          {isConnected && status?.lastSync && (
            <CardDescription className="mt-1">Last synced: {formatRelativeTime(status.lastSync)}</CardDescription>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Disabled warning */}
        {!isGranted && isConnected && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive p-3">
            <Ban className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">
              This connection is disabled. It will not be used for AI context or tools.
            </AlertDescription>
          </Alert>
        )}

        {/* Expiry warning */}
        {isExpiringSoon && isConnected && isGranted && (
          <Alert variant="default" className="bg-amber-500/10 border-amber-500/50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              Token expires soon. Reconnect to continue access.
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Reconnect button (when expiring) + Disconnect button */}
        <div className="flex flex-col gap-2">
          {isExpiringSoon && isConnected && (
            <VendorConnectButton
              vendor={vendor}
              isConnected={false}
              isLoading={isLoading}
              onConnect={onConnect || (() => {})}
              onDisconnect={() => onDisconnect(configId)}
              className="w-full"
              reconnectMode
            />
          )}
          <VendorConnectButton
            vendor={vendor}
            isConnected={isProvider ? false : isConnected}
            isLoading={isLoading}
            onConnect={onConnect || (() => {})}
            onDisconnect={() => onDisconnect(configId)}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
