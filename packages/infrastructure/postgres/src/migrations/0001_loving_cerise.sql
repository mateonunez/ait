ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '573e5a27-65b8-4f34-9c57-b78be8f90b67';--> statement-breakpoint
ALTER TABLE "spotify_playlists" ADD COLUMN "external_urls" text[];