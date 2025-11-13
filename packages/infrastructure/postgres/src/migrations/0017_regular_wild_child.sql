ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'bea6752b-a6ba-4e92-99b1-c9416b19dfb3';--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "reply_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "permalink" text;--> statement-breakpoint
CREATE INDEX "slack_messages_channel_idx" ON "slack_messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "slack_messages_thread_idx" ON "slack_messages" USING btree ("thread_ts");--> statement-breakpoint
CREATE INDEX "slack_messages_user_idx" ON "slack_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slack_messages_ts_idx" ON "slack_messages" USING btree ("ts");