import { apiDelete, apiGet, apiPost } from "@/utils/http-client";
import type { IntegrationVendor } from "@ait/core";

const API_BASE_URL = "/api";

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

export interface ConnectorConfig {
  id: string;
  userId: string;
  providerId: string;
  name: string;
  status: "active" | "inactive" | "error";
  provider?: ConnectorProvider;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  expiresAt?: string;
  isExpiringSoon?: boolean;
  granted?: boolean;
  vendor?: IntegrationVendor;
  configId?: string;
}

export type ConnectionsStatusMap = Record<string, ConnectionStatus>;

export const connectionsService = {
  async getProviders(): Promise<ConnectorProvider[]> {
    const response = await apiGet(`${API_BASE_URL}/connectors/providers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.error}`);
    }
    return response.data as ConnectorProvider[];
  },

  async getConfigs(): Promise<ConnectorConfig[]> {
    const response = await apiGet(`${API_BASE_URL}/connectors/configs`);
    if (!response.ok) {
      throw new Error(`Failed to fetch connector configurations: ${response.error}`);
    }
    return response.data as ConnectorConfig[];
  },

  async createConfig(payload: {
    providerId: string;
    name: string;
    config: Record<string, any>;
  }): Promise<ConnectorConfig> {
    const response = await apiPost(`${API_BASE_URL}/connectors/configs`, payload);
    if (!response.ok) {
      throw new Error(`Failed to create connector configuration: ${response.error}`);
    }
    return response.data as ConnectorConfig;
  },

  async deleteConfig(id: string): Promise<void> {
    const response = await apiDelete(`${API_BASE_URL}/connectors/configs/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to delete connector configuration: ${response.error}`);
    }
  },

  async getStatus(): Promise<ConnectionsStatusMap> {
    const response = await apiGet(`${API_BASE_URL}/connectors/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch connection status: ${response.error}`);
    }
    return response.data as ConnectionsStatusMap;
  },

  async disconnect(vendor: IntegrationVendor, configId?: string): Promise<{ success: boolean; message: string }> {
    const url = configId
      ? `${API_BASE_URL}/${vendor}/auth/disconnect?configId=${configId}`
      : `${API_BASE_URL}/${vendor}/auth/disconnect`;
    const response = await apiPost(url);
    if (!response.ok) {
      throw new Error(`Failed to disconnect ${vendor}: ${response.error}`);
    }
    return response.data as { success: boolean; message: string };
  },

  getAuthUrl(vendor: IntegrationVendor, configId?: string): string {
    const url = new URL(`${window.location.origin}${API_BASE_URL}/${vendor}/auth`);
    if (configId) {
      url.searchParams.append("configId", configId);
    }

    url.searchParams.append("userId", "anonymous");
    return url.toString();
  },
};
