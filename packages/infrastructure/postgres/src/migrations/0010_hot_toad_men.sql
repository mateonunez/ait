ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '14a8c1c9-af52-42c8-833f-0fd36347a431';--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "rebaseable" boolean;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "mergeable_state" varchar(50);--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "author_association" varchar(50);--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "auto_merge" boolean;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "active_lock_reason" varchar(100);--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "pr_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "pr_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "requested_teams_data" jsonb;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "head_repo_data" jsonb;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD COLUMN "base_repo_data" jsonb;