import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import type { IntegrationVendor } from "@ait/core";
import { useMemo } from "react";

export function useGrantedConfigId(vendor: IntegrationVendor): string | undefined {
  const { status } = useConnectionStatus();

  return useMemo(() => {
    if (!status) return undefined;

    return Object.values(status).find((s) => s.vendor === vendor && s.granted)?.configId;
  }, [status, vendor]);
}
