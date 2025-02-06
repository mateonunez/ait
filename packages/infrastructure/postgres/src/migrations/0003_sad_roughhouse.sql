CREATE TABLE "spotify_artists" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"popularity" integer,
	"genres" text[]
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '827f87e7-c1cc-4330-9a17-78b5ed52c81f';