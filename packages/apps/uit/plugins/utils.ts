import { readFileSync } from "node:fs";
import path from "node:path";

export function normalizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getHttpsOptions(dirname: string): { key: Buffer; cert: Buffer } | null {
  const gatewayCertDir = path.resolve(dirname, "../../gateway/certs");
  const keyPath = path.join(gatewayCertDir, "server.key");
  const certPath = path.join(gatewayCertDir, "server.crt");

  try {
    const key = readFileSync(keyPath);
    const cert = readFileSync(certPath);
    return { key, cert };
  } catch {
    return null;
  }
}

export function isGatewayHttpsEnabled(dirname: string): boolean {
  const useHttps = process.env.USE_HTTPS === "true";
  const certsExist = getHttpsOptions(dirname) !== null;
  return useHttps && certsExist;
}

export function getGatewayUrl(dirname: string, port = 3000): string {
  const protocol = isGatewayHttpsEnabled(dirname) ? "https" : "http";
  return `${protocol}://localhost:${port}`;
}
