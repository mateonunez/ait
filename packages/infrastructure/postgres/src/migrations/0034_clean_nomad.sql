CREATE TABLE "google_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"given_name" text,
	"family_name" text,
	"email" text,
	"phone_number" text,
	"organization" text,
	"job_title" text,
	"photo_url" text,
	"biography" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '774bb0c4-cfb8-4fd8-be50-3ab7479d8a6a';