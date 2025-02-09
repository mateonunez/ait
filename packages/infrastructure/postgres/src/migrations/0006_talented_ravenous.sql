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
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '648632bf-a9fb-4c5c-92e4-8d6d0a29ef16';