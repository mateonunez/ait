CREATE TABLE "google_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text,
	"product_url" text NOT NULL,
	"base_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"media_metadata" jsonb NOT NULL,
	"contributor_info" jsonb,
	"filename" text NOT NULL,
	"creation_time" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"local_path" text
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT 'c65b4c8d-d9bb-4b00-87f6-4b4eb2e9c493';