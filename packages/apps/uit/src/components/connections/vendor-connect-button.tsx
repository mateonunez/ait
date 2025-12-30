import { cn } from "@/styles/utils";
import type { IntegrationVendor } from "@ait/core";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { VENDOR_COLORS, VENDOR_ICONS, VENDOR_NAMES } from "./vendor-icons";

export interface VendorConnectButtonProps {
  vendor: IntegrationVendor;
  isConnected: boolean;
  isLoading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  className?: string;
  reconnectMode?: boolean;
}

export type VendorType = IntegrationVendor;

export function VendorConnectButton({
  vendor,
  isConnected,
  isLoading = false,
  onConnect,
  onDisconnect,
  className,
  reconnectMode = false,
}: VendorConnectButtonProps) {
  const Icon = VENDOR_ICONS[vendor];
  const colors = VENDOR_COLORS[vendor];
  const name = VENDOR_NAMES[vendor];

  const handleClick = () => {
    if (isLoading) return;
    if (isConnected && !reconnectMode) {
      onDisconnect();
    } else {
      onConnect();
    }
  };

  // Reconnect mode - show prominent reconnect button
  if (reconnectMode) {
    return (
      <Button
        onClick={handleClick}
        disabled={isLoading}
        className={cn("gap-2 min-w-[140px] bg-amber-500 hover:bg-amber-600 text-white", className)}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        <span>Reconnect</span>
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className={cn("gap-2 min-w-[140px]", className)}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span>Disconnect</span>
      </Button>
    );
  }

  // Special handling for Google (white background)
  const isGoogleStyle = vendor === "google";

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "gap-2 min-w-[180px] transition-colors border",
        isGoogleStyle
          ? "bg-white text-gray-900 border-gray-300 hover:bg-gray-100 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          : "border-transparent",
        className,
      )}
      style={
        !isGoogleStyle
          ? {
              backgroundColor: colors.bg,
              color: colors.text,
            }
          : undefined
      }
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      <span>{vendor === "slack" ? `Add to ${name}` : `Sign in with ${name}`}</span>
    </Button>
  );
}
