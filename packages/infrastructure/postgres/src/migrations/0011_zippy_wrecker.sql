ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'f211ffe6-c7e7-4850-b1d9-1e0dd18af2ae';--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "conversation_id" varchar(255);--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "in_reply_to_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "media_attachments" jsonb;--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "poll_data" jsonb;--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "place_data" jsonb;