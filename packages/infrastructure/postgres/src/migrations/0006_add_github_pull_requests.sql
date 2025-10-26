-- Migration: Add GitHub Pull Requests table
-- This migration adds comprehensive pull request tracking for GitHub repositories

CREATE TABLE "github_pull_requests" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "number" integer NOT NULL,
  "title" varchar(512) NOT NULL,
  "body" text,
  "state" varchar(50) NOT NULL,
  "draft" boolean DEFAULT false,
  "locked" boolean DEFAULT false,
  "html_url" varchar(512) NOT NULL,
  "diff_url" varchar(512),
  "patch_url" varchar(512),
  "issue_url" varchar(512),
  "merged" boolean DEFAULT false,
  "merged_at" timestamp,
  "closed_at" timestamp,
  "merge_commit_sha" varchar(255),
  "commits" integer DEFAULT 0,
  "additions" integer DEFAULT 0,
  "deletions" integer DEFAULT 0,
  "changed_files" integer DEFAULT 0,
  "comments" integer DEFAULT 0,
  "review_comments" integer DEFAULT 0,
  "head_ref" varchar(255),
  "head_sha" varchar(255),
  "base_ref" varchar(255),
  "base_sha" varchar(255),
  "repository_id" varchar(255),
  "mergeable" boolean,
  "maintainer_can_modify" boolean DEFAULT false,
  "user_data" jsonb,
  "assignee_data" jsonb,
  "assignees_data" jsonb,
  "merged_by_data" jsonb,
  "labels" jsonb,
  "milestone_data" jsonb,
  "requested_reviewers_data" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  FOREIGN KEY ("repository_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_github_pull_requests_repository_id" ON "github_pull_requests"("repository_id");
CREATE INDEX "idx_github_pull_requests_state" ON "github_pull_requests"("state");
CREATE INDEX "idx_github_pull_requests_merged" ON "github_pull_requests"("merged");
CREATE INDEX "idx_github_pull_requests_number" ON "github_pull_requests"("number");

