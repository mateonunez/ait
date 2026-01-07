import { type ConnectionStatus, type ConnectionsStatusMap, connectionsService } from "@/services/connections.service";
import type { IntegrationVendor } from "@ait/core";
import { getLogger } from "@ait/core";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

interface UseConnectionStatusOptions {
  pollingIntervalMs?: number; // in milliseconds, default 5 minutes
  enabled?: boolean;
}

export interface ConnectorProvider {
  id: string;
  slug: IntegrationVendor;
  name: string;
  description: string | null;
  icon: string | null;
  configSchema: unknown;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseConnectionStatusReturn {
  status: ConnectionsStatusMap | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  disconnect: (vendor: IntegrationVendor, configId?: string) => Promise<boolean>;
  getConfigStatus: (configId: string) => ConnectionStatus | null;
  isExpiringSoon: (configId: string) => boolean;
  isVendorGranted: (vendor: IntegrationVendor) => boolean;
  isVendorEnabled: (vendor: IntegrationVendor) => boolean;
}

const DEFAULT_POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useConnectionStatus(options: UseConnectionStatusOptions = {}): UseConnectionStatusReturn {
  const { pollingIntervalMs = DEFAULT_POLLING_INTERVAL, enabled = true } = options;

  const [status, setStatus] = useState<ConnectionsStatusMap | null>(null);
  const [providers, setProviders] = useState<ConnectorProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      const [statusData, providersData] = await Promise.all([
        connectionsService.getStatus(),
        connectionsService.getProviders(),
      ]);
      setStatus(statusData);
      setProviders(providersData);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch connection status");
      logger.error("Failed to fetch connection status:", { error: errorObj });
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const disconnect = useCallback(
    async (vendor: IntegrationVendor, configId?: string): Promise<boolean> => {
      try {
        await connectionsService.disconnect(vendor, configId);
        // Refetch status after disconnect
        await fetchStatus();
        return true;
      } catch (err) {
        logger.error(`Failed to disconnect ${vendor} (${configId || "all"}):`, { error: err });
        return false;
      }
    },
    [fetchStatus],
  );

  const getConfigStatus = useCallback(
    (configId: string): ConnectionStatus | null => {
      return status?.[configId] ?? null;
    },
    [status],
  );

  const isExpiringSoon = useCallback(
    (configId: string): boolean => {
      const configStatus = status?.[configId];
      return configStatus?.isExpiringSoon ?? false;
    },
    [status],
  );

  const isVendorGranted = useCallback(
    (vendor: IntegrationVendor): boolean => {
      if (!status) return false;
      return Object.values(status).some((s) => s.vendor === vendor && s.granted);
    },
    [status],
  );

  const isVendorEnabled = useCallback(
    (vendor: IntegrationVendor): boolean => {
      return providers.some((p) => p.slug === vendor && p.isEnabled);
    },
    [providers],
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
    getConfigStatus,
    isExpiringSoon,
    isVendorGranted,
    isVendorEnabled,
  };
}
