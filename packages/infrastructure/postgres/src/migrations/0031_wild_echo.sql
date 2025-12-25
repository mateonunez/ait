CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"user_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"trace_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '0195088a-ce7b-4677-9da1-1c74fc1778ba';--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;