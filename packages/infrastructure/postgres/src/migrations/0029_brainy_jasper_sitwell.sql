ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'ff9863e2-4e46-4e2d-8e39-24b2c9a4d19c';--> statement-breakpoint
ALTER TABLE "spotify_playlists" ALTER COLUMN "tracks" SET DATA TYPE jsonb;