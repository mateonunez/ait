CREATE TABLE "linear_issues" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"state" varchar(100) NOT NULL,
	"priority" integer,
	"assignee_id" varchar(255),
	"team_id" varchar(255) NOT NULL,
	"project_id" varchar(255),
	"url" varchar(512) NOT NULL,
	"labels" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '5e06b1f8-ff50-4328-85ec-0193ad970a96';