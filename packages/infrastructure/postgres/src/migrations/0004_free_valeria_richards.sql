ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '80a3b5b8-b5dc-4ef4-b635-16b262180c20';--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "access_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "token_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "expires_in" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "refresh_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "scope" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "provider" SET DATA TYPE text;