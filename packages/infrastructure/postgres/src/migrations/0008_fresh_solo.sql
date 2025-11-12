ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '5ee4f4c3-f829-4607-a04a-b63443deeb97';--> statement-breakpoint
ALTER TABLE "spotify_albums" ADD COLUMN "images" jsonb;--> statement-breakpoint
ALTER TABLE "spotify_artists" ADD COLUMN "images" jsonb;--> statement-breakpoint
ALTER TABLE "spotify_playlists" ADD COLUMN "images" jsonb;