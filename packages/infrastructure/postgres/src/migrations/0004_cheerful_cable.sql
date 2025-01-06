ALTER TABLE "github_repositories" ADD COLUMN "url" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "github_repositories" DROP COLUMN "repository_id";