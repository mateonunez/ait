-- Migration: Add media, polls, places, and conversation context to X tweets
-- This migration adds support for rich media attachments, polls, location data, and thread context

ALTER TABLE "x_tweets" 
ADD COLUMN "conversation_id" varchar(255),
ADD COLUMN "in_reply_to_user_id" varchar(255),
ADD COLUMN "media_attachments" jsonb,
ADD COLUMN "poll_data" jsonb,
ADD COLUMN "place_data" jsonb;

-- Create indexes for faster queries on conversation threading
CREATE INDEX "idx_x_tweets_conversation_id" ON "x_tweets"("conversation_id");
CREATE INDEX "idx_x_tweets_in_reply_to_user_id" ON "x_tweets"("in_reply_to_user_id");

-- Add comments for documentation
COMMENT ON COLUMN "x_tweets"."conversation_id" IS 'Thread conversation ID for grouping related tweets';
COMMENT ON COLUMN "x_tweets"."in_reply_to_user_id" IS 'User ID this tweet is replying to';
COMMENT ON COLUMN "x_tweets"."media_attachments" IS 'Array of media objects (photos, videos, GIFs) with metadata';
COMMENT ON COLUMN "x_tweets"."poll_data" IS 'Poll data including options, votes, and status';
COMMENT ON COLUMN "x_tweets"."place_data" IS 'Location/place information with coordinates';
