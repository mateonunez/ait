import type { CollectionVendor } from "../config/collections.config";

export type TemporalIntent = "future" | "past" | "today" | "all";

export interface TypeFilter {
  types?: string[];
  timeRange?: {
    from?: string;
    to?: string;
  };
  temporalIntent?: TemporalIntent;
  collections?: CollectionVendor[];
}
