ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '3daca23a-23ce-4604-a388-1940b10a762f';--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "files" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "reactions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "edited" jsonb;--> statement-breakpoint
ALTER TABLE "slack_messages" ADD COLUMN "pinned_to" jsonb DEFAULT '[]'::jsonb;