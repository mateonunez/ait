import type { ConnectionStatus } from "@/services/connections.service";
import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@/utils/date.utils";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { VendorConnectButton } from "./vendor-connect-button";
import { VENDOR_COLORS, VENDOR_ICONS, VENDOR_NAMES } from "./vendor-icons";
import type { IntegrationVendor } from "@ait/core";

interface ConnectionCardProps {
  vendor: IntegrationVendor;
  status: ConnectionStatus | null;
  isLoading?: boolean;
  isExpiringSoon?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  error?: string | null;
  className?: string;
}

export function ConnectionCard({
  vendor,
  status,
  isLoading = false,
  isExpiringSoon = false,
  onConnect,
  onDisconnect,
  error,
  className,
}: ConnectionCardProps) {
  const Icon = VENDOR_ICONS[vendor];
  const colors = VENDOR_COLORS[vendor];
  const name = VENDOR_NAMES[vendor];

  const isConnected = status?.connected ?? false;

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
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: colors.bg }}
      />

      <CardHeader className="flex flex-row items-center gap-4 pb-2 pt-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: colors.text }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{name}</CardTitle>
            {isConnected ? (
              <Badge variant="default" className="gap-1 bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not connected
              </Badge>
            )}
          </div>

          {isConnected && status?.lastSync && (
            <CardDescription className="mt-1">
              Last synced: {formatRelativeTime(status.lastSync)}
            </CardDescription>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Expiry warning */}
        {isExpiringSoon && isConnected && (
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

        {/* Connect/Disconnect button */}
        <VendorConnectButton
          vendor={vendor}
          isConnected={isConnected}
          isLoading={isLoading}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
