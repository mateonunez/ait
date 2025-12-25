import { type ConnectionStatus, type ConnectionsStatusMap, connectionsService } from "@/services/connections.service";
import type { IntegrationVendor } from "@ait/core";
import { getLogger } from "@ait/core";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

interface UseConnectionStatusOptions {
  pollingIntervalMs?: number; // in milliseconds, default 5 minutes
  enabled?: boolean;
}

interface UseConnectionStatusReturn {
  status: ConnectionsStatusMap | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  disconnect: (vendor: IntegrationVendor) => Promise<boolean>;
  getVendorStatus: (vendor: IntegrationVendor) => ConnectionStatus | null;
  isExpiringSoon: (vendor: IntegrationVendor, hoursThreshold?: number) => boolean;
}

const DEFAULT_POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useConnectionStatus(options: UseConnectionStatusOptions = {}): UseConnectionStatusReturn {
  const { pollingIntervalMs = DEFAULT_POLLING_INTERVAL, enabled = true } = options;

  const [status, setStatus] = useState<ConnectionsStatusMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await connectionsService.getStatus();
      setStatus(data);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch connection status");
      logger.error("Failed to fetch connection status:", { error: errorObj });
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const disconnect = useCallback(
    async (vendor: IntegrationVendor): Promise<boolean> => {
      try {
        await connectionsService.disconnect(vendor);
        // Refetch status after disconnect
        await fetchStatus();
        return true;
      } catch (err) {
        logger.error(`Failed to disconnect ${vendor}:`, { error: err });
        return false;
      }
    },
    [fetchStatus],
  );

  const getVendorStatus = useCallback(
    (vendor: IntegrationVendor): ConnectionStatus | null => {
      return status?.[vendor] ?? null;
    },
    [status],
  );

  const isExpiringSoon = useCallback(
    (vendor: IntegrationVendor, hoursThreshold = 24): boolean => {
      const vendorStatus = status?.[vendor];
      if (!vendorStatus?.expiresAt) return false;

      const expiresAt = new Date(vendorStatus.expiresAt);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      return hoursUntilExpiry <= hoursThreshold && hoursUntilExpiry > 0;
    },
    [status],
  );

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling
  useEffect(() => {
    if (!enabled || pollingIntervalMs <= 0) return;

    const intervalId = setInterval(fetchStatus, pollingIntervalMs);
    return () => clearInterval(intervalId);
  }, [enabled, pollingIntervalMs, fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    disconnect,
    getVendorStatus,
    isExpiringSoon,
  };
}
