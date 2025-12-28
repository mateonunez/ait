import type { CollectionVendor } from "../config/collections.config";

export interface TypeFilter {
  types?: string[];
  timeRange?: {
    from?: string;
    to?: string;
  };
  collections?: CollectionVendor[];
}
