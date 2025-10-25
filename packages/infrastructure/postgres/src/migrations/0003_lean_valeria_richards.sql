ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'a78b3537-43f7-4bd1-b851-16821cba34d1';--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "album_data" jsonb;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "artists_data" jsonb;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "external_ids" jsonb;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "external_urls" jsonb;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "added_at" timestamp;