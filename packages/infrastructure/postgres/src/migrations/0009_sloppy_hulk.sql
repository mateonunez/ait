ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '5cf251af-032e-4134-9e9a-43ce6415960b';--> statement-breakpoint
ALTER TABLE "spotify_recently_played" ADD COLUMN "album_data" jsonb;