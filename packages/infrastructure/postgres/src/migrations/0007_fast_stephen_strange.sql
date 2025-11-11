ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '43d07259-9005-465d-8b87-f3545bac71ae';--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "repository_name" varchar(255);--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "repository_full_name" varchar(512);--> statement-breakpoint
ALTER TABLE "linear_issues" ADD COLUMN "assignee_name" varchar(255);--> statement-breakpoint
ALTER TABLE "linear_issues" ADD COLUMN "team_name" varchar(255);--> statement-breakpoint
ALTER TABLE "linear_issues" ADD COLUMN "project_name" varchar(255);--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "author_username" varchar(255);--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "author_name" varchar(255);--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "reply_count" integer;--> statement-breakpoint
ALTER TABLE "x_tweets" ADD COLUMN "quote_count" integer;