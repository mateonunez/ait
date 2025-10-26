-- Migration: Enhance GitHub Repositories with comprehensive metadata
-- This migration adds extensive metadata fields to support rich repository information

ALTER TABLE "github_repositories" ADD COLUMN "full_name" varchar(512);
ALTER TABLE "github_repositories" ADD COLUMN "private" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "fork" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "archived" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "disabled" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "visibility" varchar(50);
ALTER TABLE "github_repositories" ADD COLUMN "watchers_count" integer DEFAULT 0;
ALTER TABLE "github_repositories" ADD COLUMN "open_issues_count" integer DEFAULT 0;
ALTER TABLE "github_repositories" ADD COLUMN "size" integer DEFAULT 0;
ALTER TABLE "github_repositories" ADD COLUMN "default_branch" varchar(255);
ALTER TABLE "github_repositories" ADD COLUMN "topics" text[];
ALTER TABLE "github_repositories" ADD COLUMN "is_template" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "has_issues" boolean DEFAULT true;
ALTER TABLE "github_repositories" ADD COLUMN "has_projects" boolean DEFAULT true;
ALTER TABLE "github_repositories" ADD COLUMN "has_wiki" boolean DEFAULT true;
ALTER TABLE "github_repositories" ADD COLUMN "has_pages" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "has_discussions" boolean DEFAULT false;
ALTER TABLE "github_repositories" ADD COLUMN "homepage" varchar(512);
ALTER TABLE "github_repositories" ADD COLUMN "pushed_at" timestamp;
ALTER TABLE "github_repositories" ADD COLUMN "license_name" varchar(255);
ALTER TABLE "github_repositories" ADD COLUMN "clone_url" varchar(512);
ALTER TABLE "github_repositories" ADD COLUMN "ssh_url" varchar(512);
ALTER TABLE "github_repositories" ADD COLUMN "owner_data" jsonb;
ALTER TABLE "github_repositories" ADD COLUMN "license_data" jsonb;
ALTER TABLE "github_repositories" ADD COLUMN "metadata" jsonb;

