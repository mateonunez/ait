-- Migration: Add GitHub Commits table
-- This migration adds comprehensive commit tracking for GitHub repositories
-- Stores commit data including diffs, file changes, messages, and timestamps for vector database integration

CREATE TABLE "github_commits" (
  "sha" varchar(255) PRIMARY KEY NOT NULL,
  "message" text NOT NULL,
  "message_body" text,
  "html_url" varchar(512) NOT NULL,
  "comments_url" varchar(512) NOT NULL,
  "node_id" varchar(255),
  "author_name" varchar(255),
  "author_email" varchar(255),
  "author_date" timestamp,
  "committer_name" varchar(255),
  "committer_email" varchar(255),
  "committer_date" timestamp,
  "tree_sha" varchar(255) NOT NULL,
  "tree_url" varchar(512) NOT NULL,
  "parent_shas" text[],
  "additions" integer DEFAULT 0,
  "deletions" integer DEFAULT 0,
  "total" integer DEFAULT 0,
  "repository_id" varchar(255),
  "repository_name" varchar(255),
  "repository_full_name" varchar(512),
  "author_data" jsonb,
  "committer_data" jsonb,
  "files_data" jsonb,
  "verification" jsonb,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  FOREIGN KEY ("repository_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_github_commits_repository_id" ON "github_commits"("repository_id");
CREATE INDEX "idx_github_commits_author_date" ON "github_commits"("author_date");
CREATE INDEX "idx_github_commits_committer_date" ON "github_commits"("committer_date");
CREATE INDEX "idx_github_commits_sha" ON "github_commits"("sha");
