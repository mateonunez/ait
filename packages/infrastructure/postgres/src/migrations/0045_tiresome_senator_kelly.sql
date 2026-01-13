CREATE TABLE "github_issues" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"title" varchar(512) NOT NULL,
	"body" text,
	"state" varchar(50) NOT NULL,
	"state_reason" varchar(100),
	"locked" boolean DEFAULT false,
	"html_url" varchar(512) NOT NULL,
	"comments" integer DEFAULT 0,
	"repository_id" varchar(255),
	"repository_name" varchar(255),
	"repository_full_name" varchar(512),
	"issue_created_at" timestamp,
	"issue_updated_at" timestamp,
	"issue_closed_at" timestamp,
	"author_data" jsonb,
	"assignee_data" jsonb,
	"assignees_data" jsonb,
	"labels" jsonb,
	"milestone_data" jsonb,
	"reactions_data" jsonb,
	"is_pull_request" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_gmail_messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"thread_id" varchar(255) NOT NULL,
	"connector_config_id" varchar(255) NOT NULL,
	"history_id" varchar(255),
	"snippet" text,
	"internal_date" varchar(255),
	"label_ids" jsonb,
	"payload" jsonb,
	"subject" text,
	"from" text,
	"to" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "google_gmail_messages" ADD CONSTRAINT "google_gmail_messages_connector_config_id_connector_configs_id_fk" FOREIGN KEY ("connector_config_id") REFERENCES "public"."connector_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "google_gmail_messages_connector_config_id_idx" ON "google_gmail_messages" USING btree ("connector_config_id");--> statement-breakpoint
CREATE INDEX "google_gmail_messages_thread_id_idx" ON "google_gmail_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "google_gmail_messages_internal_date_idx" ON "google_gmail_messages" USING btree ("internal_date");