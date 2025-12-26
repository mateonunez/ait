CREATE TYPE "public"."feedback_rating" AS ENUM('thumbs_up', 'thumbs_down', 'neutral');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"trace_id" text,
	"rating" "feedback_rating" NOT NULL,
	"comment" text,
	"user_id" text,
	"session_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '0783435e-8ceb-4407-9d97-fc6af65de75a';--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;