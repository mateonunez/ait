CREATE TYPE "public"."connector_config_status" AS ENUM('active', 'error', 'revoked', 'pending');--> statement-breakpoint
CREATE TYPE "public"."provider_auth_type" AS ENUM('oauth2', 'api_key', 'basic');--> statement-breakpoint
CREATE TABLE "connector_configs" (
	"id" text PRIMARY KEY DEFAULT 'bea2982e-3f7b-4136-bec4-df95224035a5' NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"name" text NOT NULL,
	"encrypted_config" text NOT NULL,
	"iv" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"status" "connector_config_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY DEFAULT 'f2e33000-1533-4a8c-9681-2868278ed84e' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"auth_type" "provider_auth_type" DEFAULT 'oauth2' NOT NULL,
	"config_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "id" SET DEFAULT '1db2e62e-1434-48cc-a146-da4967f5814f';--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD COLUMN "connector_config_id" text;--> statement-breakpoint
ALTER TABLE "connector_configs" ADD CONSTRAINT "connector_configs_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_connector_config_id_connector_configs_id_fk" FOREIGN KEY ("connector_config_id") REFERENCES "public"."connector_configs"("id") ON DELETE cascade ON UPDATE no action;