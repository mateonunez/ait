import type { IConnectorOAuthConfig } from "@/shared/auth/lib/oauth/connector.oauth";
import type { ConnectorType } from "@/types/infrastructure/connector.interface";

const CONFIG_SUFFIXES = ["CLIENT_ID", "CLIENT_SECRET", "ENDPOINT", "REDIRECT_URI"] as const;

const keyMapping: Record<(typeof CONFIG_SUFFIXES)[number], keyof IConnectorOAuthConfig> = {
  CLIENT_ID: "clientId",
  CLIENT_SECRET: "clientSecret",
  ENDPOINT: "endpoint",
  REDIRECT_URI: "redirectUri",
};

function createConnectorConfig<T extends string>(serviceKey: T): Record<T, IConnectorOAuthConfig> {
  const prefix = serviceKey.toUpperCase();
  const config = {} as IConnectorOAuthConfig;

  for (const suffix of CONFIG_SUFFIXES) {
    const envKey = `${prefix}_${suffix}`;
    const value = process.env[envKey];

    if (!value) {
      throw new Error(`Missing environment variable: ${envKey}`);
    }

    const configKey = keyMapping[suffix];
    config[configKey] = value;
  }

  return { [serviceKey]: config } as Record<T, IConnectorOAuthConfig>;
}

function createConnectorConfigs<T extends string>(services: T[]): Record<T, IConnectorOAuthConfig> {
  return services.reduce(
    (acc, service) => ({
      // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
      ...acc,
      ...createConnectorConfig(service),
    }),
    {} as Record<T, IConnectorOAuthConfig>,
  );
}

const connectors: ConnectorType[] = ["github", "spotify"];
export const connectorConfigs = createConnectorConfigs(connectors);
export type ValidConnectorConfig = keyof typeof connectorConfigs;
