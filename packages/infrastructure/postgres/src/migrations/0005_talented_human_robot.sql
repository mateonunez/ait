ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'cbd57ce6-4979-4a1e-b24f-adda1471b287';--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "full_name" varchar(512);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "private" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "fork" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "archived" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "disabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "visibility" varchar(50);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "watchers_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "open_issues_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "size" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "default_branch" varchar(255);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "topics" text[];--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "is_template" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "has_issues" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "has_projects" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "has_wiki" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "has_pages" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "has_discussions" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "homepage" varchar(512);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "pushed_at" timestamp;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "license_name" varchar(255);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "clone_url" varchar(512);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "ssh_url" varchar(512);--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "owner_data" jsonb;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "license_data" jsonb;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "metadata" jsonb;