ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '43672ae1-68df-4a90-98e5-1580f74a7b75';--> statement-breakpoint
ALTER TABLE "spotify_playlists" DROP COLUMN IF EXISTS "tracks";-->statement-breakpoint
ALTER TABLE "spotify_playlists" ADD COLUMN "tracks" jsonb;
