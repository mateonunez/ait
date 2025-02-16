CREATE TABLE "github_repositories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"stars" integer NOT NULL,
	"forks" integer NOT NULL,
	"url" varchar(255) NOT NULL,
	"language" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" text PRIMARY KEY DEFAULT '2b9b8dac-7f8e-4679-a962-bad654a547bf' NOT NULL,
	"access_token" text,
	"token_type" text,
	"expires_in" text,
	"refresh_token" text,
	"scope" text,
	"provider" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
CREATE TABLE "spotify_artists" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"popularity" integer,
	"genres" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spotify_playlists" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"public" boolean DEFAULT false NOT NULL,
	"collaborative" boolean DEFAULT false NOT NULL,
	"owner" varchar(255) NOT NULL,
	"tracks" text[],
	"followers" integer DEFAULT 0 NOT NULL,
	"snapshot_id" varchar(255) NOT NULL,
	"uri" varchar(255) NOT NULL,
	"href" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spotify_tracks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"artist" varchar(255) NOT NULL,
	"album" varchar(255),
	"duration_ms" integer NOT NULL,
	"explicit" boolean DEFAULT false NOT NULL,
	"is_playable" boolean,
	"preview_url" varchar(512),
	"track_number" integer,
	"disc_number" integer,
	"uri" varchar(255),
	"href" varchar(512),
	"is_local" boolean DEFAULT false NOT NULL,
	"popularity" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "x_tweets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"author_id" varchar(255) NOT NULL,
	"lang" varchar(10),
	"retweet_count" integer,
	"like_count" integer,
	"json_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
