CREATE TABLE "spotify_playlists" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"public" boolean DEFAULT false NOT NULL,
	"collaborative" boolean DEFAULT false NOT NULL,
	"owner" varchar(255) NOT NULL,
	"tracks" integer DEFAULT 0 NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"snapshot_id" varchar(255) NOT NULL,
	"uri" varchar(255) NOT NULL,
	"href" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '8e0acee5-1e24-41fa-96f8-a427b9532e13';