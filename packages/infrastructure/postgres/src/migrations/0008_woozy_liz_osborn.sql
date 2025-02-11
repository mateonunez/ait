ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '4f8fdb47-2646-4d00-b084-fed8ab25d5c6';--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "explicit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "is_playable" boolean;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "preview_url" varchar(512);--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "track_number" integer;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "disc_number" integer;--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "uri" varchar(255);--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "href" varchar(512);--> statement-breakpoint
ALTER TABLE "spotify_tracks" ADD COLUMN "is_local" boolean DEFAULT false NOT NULL;