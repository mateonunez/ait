CREATE TABLE IF NOT EXISTS "slack_messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"channel_id" varchar(255) NOT NULL,
	"channel_name" varchar(255) NOT NULL,
	"text" text NOT NULL,
	"user_id" varchar(255),
	"user_name" varchar(255),
	"thread_ts" varchar(255),
	"ts" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'a59c93fb-4182-4fb3-b797-d444c965fec5';

