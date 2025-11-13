CREATE TABLE "notion_pages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" varchar(512) NOT NULL,
	"parent_type" varchar(100),
	"parent_id" varchar(255),
	"archived" boolean DEFAULT false NOT NULL,
	"icon" text,
	"cover" text,
	"properties" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255),
	"last_edited_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '4b7e69f0-0b77-4d12-a58a-33672eff96dd';