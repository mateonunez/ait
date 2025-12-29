export const STORAGE_BUCKETS = {
  PHOTOS: "photos",
  AVATARS: "avatars",
  DOCUMENTS: "documents",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
