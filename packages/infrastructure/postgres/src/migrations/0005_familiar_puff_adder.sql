ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '8255f484-1943-4567-8270-0e5015ee0270';--> statement-breakpoint
ALTER TABLE "spotify_artists" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "spotify_artists" ADD COLUMN "updated_at" timestamp DEFAULT now();