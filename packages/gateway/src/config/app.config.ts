import { readFileSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

export const APP_VERSION = packageJson.version;
export const APP_ENVIRONMENT = process.env.NODE_ENV || "development";
export const DEPLOYMENT_TIMESTAMP = new Date().toISOString();
