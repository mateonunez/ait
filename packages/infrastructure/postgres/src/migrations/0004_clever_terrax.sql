CREATE TABLE "spotify_recently_played" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"track_id" varchar(255) NOT NULL,
	"track_name" varchar(255) NOT NULL,
	"artist" varchar(255) NOT NULL,
	"album" varchar(255),
	"duration_ms" integer NOT NULL,
	"explicit" boolean DEFAULT false NOT NULL,
	"popularity" integer,
	"played_at" timestamp NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'bf26ce15-f147-4b6d-acfa-434dc679b159';