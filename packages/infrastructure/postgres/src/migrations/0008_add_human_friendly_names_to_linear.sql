-- Migration: Add human-friendly name fields to Linear issues
-- This migration adds team name, assignee name, and project name for better context

ALTER TABLE "linear_issues" 
ADD COLUMN "assignee_name" varchar(255),
ADD COLUMN "team_name" varchar(255),
ADD COLUMN "project_name" varchar(255);

-- Create indexes for faster queries
CREATE INDEX "idx_linear_issues_team_name" ON "linear_issues"("team_name");
CREATE INDEX "idx_linear_issues_assignee_name" ON "linear_issues"("assignee_name");

