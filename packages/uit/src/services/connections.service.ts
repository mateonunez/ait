import { apiGet, apiPost } from "@/utils/http-client";
import type { IntegrationVendor } from "@ait/core";

const API_BASE_URL = "/api";

export interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  expiresAt?: string;
}

export type ConnectionsStatusMap = Record<IntegrationVendor, ConnectionStatus>;

type DisconnectResponse = {
  success: boolean;
  message: string;
};

export const connectionsService = {
  async getStatus(): Promise<ConnectionsStatusMap> {
    const response = await apiGet(`${API_BASE_URL}/connectors/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch connection status: ${response.error}`);
    }
    return response.data as ConnectionsStatusMap;
  },

  async disconnect(vendor: IntegrationVendor): Promise<DisconnectResponse> {
    const response = await apiPost(`${API_BASE_URL}/${vendor}/auth/disconnect`);
    if (!response.ok) {
      throw new Error(`Failed to disconnect ${vendor}: ${response.error}`);
    }
    return response.data as DisconnectResponse;
  },

  getAuthUrl(vendor: IntegrationVendor): string {
    return `${API_BASE_URL}/${vendor}/auth`;
  },
};
