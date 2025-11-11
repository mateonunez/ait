-- Migration: Add repository name fields to GitHub Pull Requests
-- This migration adds human-readable repository name fields for better context

ALTER TABLE "github_pull_requests" 
ADD COLUMN "repository_name" varchar(255),
ADD COLUMN "repository_full_name" varchar(512);

-- Create index for faster queries
CREATE INDEX "idx_github_pull_requests_repository_full_name" ON "github_pull_requests"("repository_full_name");
