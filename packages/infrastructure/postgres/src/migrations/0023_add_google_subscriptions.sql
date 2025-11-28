CREATE TABLE IF NOT EXISTS "google_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"channel_id" text NOT NULL,
	"resource_channel_id" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"thumbnail_url" text,
	"total_item_count" integer DEFAULT 0 NOT NULL,
	"new_item_count" integer DEFAULT 0 NOT NULL,
	"activity_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
