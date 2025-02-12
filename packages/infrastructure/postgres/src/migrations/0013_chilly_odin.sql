CREATE TABLE "spotify_albums" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"album_type" varchar(50) NOT NULL,
	"artists" text[],
	"tracks" text[],
	"total_tracks" integer DEFAULT 0 NOT NULL,
	"release_date" varchar(50),
	"release_date_precision" varchar(50),
	"is_playable" boolean DEFAULT true NOT NULL,
	"uri" varchar(255) NOT NULL,
	"href" varchar(512) NOT NULL,
	"popularity" integer,
	"label" varchar(255),
	"copyrights" text[],
	"external_ids" text[],
	"genres" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'd7e49e1f-ceb5-443b-9f8d-d2b9d8b35dcc';