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
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"access_token" varchar(255),
	"token_type" varchar(255),
	"expires_in" integer,
	"refresh_token" varchar(255),
	"scope" varchar(255),
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
	"popularity" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
