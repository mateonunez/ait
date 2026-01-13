export const telemetryEnabled = process.env.LANGFUSE_ENABLED === "true";

export const telemetryConfig = {
  enabled: telemetryEnabled,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseURL: process.env.LANGFUSE_BASEURL || "https://localhost:3000",
  flushAt: 1,
  flushInterval: 1000,
};
