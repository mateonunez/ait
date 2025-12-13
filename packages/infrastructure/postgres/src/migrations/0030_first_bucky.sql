CREATE TABLE "github_repository_files" (
	"id" varchar(512) PRIMARY KEY NOT NULL,
	"repository_id" varchar(255) NOT NULL,
	"repository_full_name" varchar(512) NOT NULL,
	"branch" varchar(255) NOT NULL,
	"path" varchar(1024) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sha" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"size" integer DEFAULT 0,
	"language" varchar(100),
	"extension" varchar(50),
	"lines_of_code" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '9f519cf0-d7c6-47bb-9776-8921e1f5ad1c';