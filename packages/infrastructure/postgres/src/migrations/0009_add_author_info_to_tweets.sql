-- Migration: Add author information and engagement metrics to X tweets
-- This migration adds author username, name, and additional engagement metrics for better context

ALTER TABLE "x_tweets" 
ADD COLUMN "author_username" varchar(255),
ADD COLUMN "author_name" varchar(255),
ADD COLUMN "reply_count" integer,
ADD COLUMN "quote_count" integer;

-- Create index for faster queries
CREATE INDEX "idx_x_tweets_author_username" ON "x_tweets"("author_username");

