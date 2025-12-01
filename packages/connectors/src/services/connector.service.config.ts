import { AItError } from "@ait/core";
import type { IConnectorOAuthConfig } from "../shared/auth/lib/oauth/connector.oauth";
import type { ConnectorType } from "./vendors/connector.vendors.config";

const CONFIG_SUFFIXES = ["CLIENT_ID", "CLIENT_SECRET", "ENDPOINT", "REDIRECT_URI"] as const;

const keyMapping: Record<(typeof CONFIG_SUFFIXES)[number], keyof IConnectorOAuthConfig> = {
  CLIENT_ID: "clientId",
  CLIENT_SECRET: "clientSecret",
  ENDPOINT: "endpoint",
  REDIRECT_URI: "redirectUri",
};

const configCache: Partial<Record<ConnectorType, IConnectorOAuthConfig>> = {};

export function getConnectorConfig(serviceKey: ConnectorType): IConnectorOAuthConfig {
  if (configCache[serviceKey]) {
    return configCache[serviceKey]!;
  }

  const prefix = serviceKey.toUpperCase();
  const config: Partial<IConnectorOAuthConfig> = {};

  for (const suffix of CONFIG_SUFFIXES) {
    const envKey = `${prefix}_${suffix}`;
    const value = process.env[envKey];

    if (!value) {
      throw new AItError("CONNECTOR_ENV", `Missing environment variable: ${envKey}`);
    }

    const configKey = keyMapping[suffix];
    config[configKey] = value;
  }

  configCache[serviceKey] = config as IConnectorOAuthConfig;
  return configCache[serviceKey]!;
}
