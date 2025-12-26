import type { IntegrationVendor } from "./entities.config";

export interface EntityActivityBreakdown {
  total: number;
  daily: Array<{ date: string; count: number }>;
  displayName: string;
}

export interface IntegrationActivity {
  total: number;
  daily: Array<{ date: string; count: number }>;
  byEntity?: Record<string, EntityActivityBreakdown>;
}

export type ActivityData = Partial<Record<IntegrationVendor, IntegrationActivity>>;
