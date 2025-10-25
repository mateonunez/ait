ALTER TABLE "spotify_tracks" ADD COLUMN "album_data" jsonb;
ALTER TABLE "spotify_tracks" ADD COLUMN "artists_data" jsonb;
ALTER TABLE "spotify_tracks" ADD COLUMN "external_ids" jsonb;
ALTER TABLE "spotify_tracks" ADD COLUMN "external_urls" jsonb;
ALTER TABLE "spotify_tracks" ADD COLUMN "added_at" timestamp;

