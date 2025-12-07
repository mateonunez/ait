ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'e235a86c-9364-47ba-8862-419c7e616beb';--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD COLUMN "metadata" jsonb;