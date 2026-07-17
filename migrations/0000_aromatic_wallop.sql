CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('user', 'team', 'admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"provider" text DEFAULT 'openai' NOT NULL,
	"api_key" text NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"endpoint" text DEFAULT 'https://api.openai.com/v1',
	"temperature" text DEFAULT '0.7',
	"max_tokens" text DEFAULT '2048',
	"is_active" boolean DEFAULT false,
	"words" text[] DEFAULT ARRAY[]::text[],
	"site_id" varchar,
	"last_skip_reason" text,
	"last_skip_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"date" timestamp with time zone NOT NULL,
	"messages_sent" integer DEFAULT 0,
	"messages_delivered" integer DEFAULT 0,
	"messages_read" integer DEFAULT 0,
	"messages_replied" integer DEFAULT 0,
	"new_contacts" integer DEFAULT 0,
	"active_campaigns" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"request_type" varchar(50) NOT NULL,
	"endpoint" text NOT NULL,
	"method" varchar(10) NOT NULL,
	"request_body" jsonb,
	"response_status" integer,
	"response_body" jsonb,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_edges" (
	"id" varchar PRIMARY KEY NOT NULL,
	"automation_id" varchar NOT NULL,
	"source_node_id" varchar NOT NULL,
	"target_node_id" varchar NOT NULL,
	"source_handle" varchar,
	"animated" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "automation_edges_unique_handle_idx" UNIQUE("automation_id","source_node_id","target_node_id","source_handle")
);
--> statement-breakpoint
CREATE TABLE "automation_execution_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"node_type" text NOT NULL,
	"status" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb,
	"output" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"executed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" varchar NOT NULL,
	"contact_id" varchar,
	"conversation_id" varchar,
	"trigger_data" jsonb DEFAULT '{}'::jsonb,
	"trigger_message_id" varchar(200),
	"status" text NOT NULL,
	"current_node_id" varchar,
	"execution_path" jsonb DEFAULT '[]'::jsonb,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"result" text,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automation_nodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"position" jsonb DEFAULT '{}'::jsonb,
	"measured" jsonb DEFAULT '{}'::jsonb,
	"data" jsonb DEFAULT '{}'::jsonb,
	"connections" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "automation_nodes_unique_idx" UNIQUE("automation_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'inactive',
	"execution_count" integer DEFAULT 0,
	"last_executed_at" timestamp with time zone,
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"contact_id" varchar,
	"phone" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'pending',
	"whatsapp_message_id" varchar,
	"template_params" jsonb DEFAULT '{}'::jsonb,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error_code" varchar,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "campaign_phone_unique" UNIQUE("campaign_id","phone")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"created_by" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"campaign_type" text NOT NULL,
	"type" text NOT NULL,
	"api_type" text NOT NULL,
	"template_id" varchar,
	"template_name" text,
	"template_language" text,
	"variable_mapping" jsonb DEFAULT '{}'::jsonb,
	"contact_groups" jsonb DEFAULT '[]'::jsonb,
	"csv_data" jsonb DEFAULT '[]'::jsonb,
	"api_key" varchar,
	"api_endpoint" text,
	"status" text DEFAULT 'draft',
	"scheduled_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"read_count" integer DEFAULT 0,
	"replied_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"completed_at" timestamp with time zone,
	"population_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_signup_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'incomplete' NOT NULL,
	"step" varchar(50) DEFAULT 'token_exchange' NOT NULL,
	"error_message" text,
	"error_details" jsonb,
	"phone_number" text,
	"waba_id" text,
	"channel_id" varchar,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number_id" text NOT NULL,
	"access_token" text NOT NULL,
	"whatsapp_business_account_id" text,
	"phone_number" text,
	"app_id" text,
	"is_active" boolean DEFAULT true,
	"is_coexistence" boolean DEFAULT false,
	"health_status" text DEFAULT 'unknown',
	"last_health_check" timestamp with time zone,
	"health_details" jsonb DEFAULT '{}'::jsonb,
	"connection_method" varchar(20) DEFAULT 'embedded',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "chatbots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uuid" text NOT NULL,
	"title" text NOT NULL,
	"bubble_message" text,
	"welcome_message" text,
	"instructions" text,
	"connect_message" text,
	"language" text DEFAULT 'en',
	"interaction_type" text DEFAULT 'ai-only',
	"avatar_id" integer,
	"avatar_emoji" text,
	"avatar_color" text,
	"primary_color" text DEFAULT '#3B82F6',
	"logo_url" text,
	"embed_width" integer DEFAULT 420,
	"embed_height" integer DEFAULT 745,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chatbots_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "client_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar,
	"name" varchar(100) NOT NULL,
	"api_key" varchar(64) NOT NULL,
	"secret_hash" varchar(256) NOT NULL,
	"permissions" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp with time zone,
	"request_count" integer DEFAULT 0,
	"monthly_request_count" integer DEFAULT 0,
	"monthly_reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"revoked_at" timestamp with time zone,
	CONSTRAINT "client_api_keys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "client_api_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer,
	"response_time" integer,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar,
	"url" text NOT NULL,
	"secret" varchar(256),
	"events" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"tenant_id" varchar,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"groups" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active',
	"source" varchar(100),
	"last_contact" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar,
	CONSTRAINT "contacts_channel_phone_unique" UNIQUE("channel_id","phone")
);
--> statement-breakpoint
CREATE TABLE "conversation_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"assigned_by" varchar,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"status" text DEFAULT 'active' NOT NULL,
	"priority" text DEFAULT 'normal',
	"notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_pins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"channel_id" varchar,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"contact_id" varchar,
	"assigned_to" varchar,
	"contact_phone" varchar,
	"contact_name" varchar,
	"status" text DEFAULT 'open',
	"priority" text DEFAULT 'normal',
	"type" text DEFAULT 'whatsapp',
	"chatbot_id" varchar,
	"session_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"unread_count" integer DEFAULT 0,
	"last_message_at" timestamp with time zone,
	"last_incoming_message_at" timestamp with time zone,
	"last_message_text" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "firebase_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key" text,
	"auth_domain" text,
	"project_id" text,
	"storage_bucket" text,
	"messaging_sender_id" text,
	"app_id" text,
	"measurement_id" text,
	"private_key" text,
	"client_email" text,
	"vapid_key" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channelId" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"order" integer DEFAULT 0,
	"published" boolean DEFAULT true,
	"views" integer DEFAULT 0,
	"helpful" integer DEFAULT 0,
	"not_helpful" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" varchar NOT NULL,
	"parent_id" varchar,
	"name" varchar(255) NOT NULL,
	"icon" varchar(50),
	"description" text,
	"order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"channel_id" varchar,
	"recipient_phone" varchar(20) NOT NULL,
	"template_name" varchar(100),
	"template_language" varchar(20) DEFAULT 'en_US',
	"template_params" jsonb DEFAULT '[]'::jsonb,
	"message_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'queued',
	"attempts" integer DEFAULT 0,
	"whatsapp_message_id" varchar(100),
	"conversation_id" varchar(100),
	"sent_via" varchar(20),
	"cost" varchar(20),
	"error_code" varchar(50),
	"error_message" text,
	"scheduled_for" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar,
	"whatsapp_message_id" varchar,
	"from_user" boolean DEFAULT false,
	"direction" varchar DEFAULT 'outbound',
	"content" text NOT NULL,
	"type" text DEFAULT 'text',
	"from_type" varchar DEFAULT 'user',
	"message_type" varchar,
	"media_id" varchar,
	"media_url" text,
	"media_mime_type" varchar(100),
	"media_sha256" varchar(128),
	"status" text DEFAULT 'sent',
	"timestamp" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error_code" varchar(50),
	"error_message" text,
	"error_details" jsonb,
	"campaign_id" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar NOT NULL,
	"label" varchar NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"is_email_enabled" boolean DEFAULT true,
	"is_in_app_enabled" boolean DEFAULT true,
	"variables" text[] DEFAULT ARRAY[]::text[],
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "notification_templates_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" varchar DEFAULT 'general' NOT NULL,
	"created_by" varchar DEFAULT 'system' NOT NULL,
	"channel_id" varchar,
	"target_type" varchar NOT NULL,
	"target_ids" text[] DEFAULT ARRAY[]::text[],
	"status" varchar DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "panel_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"tagline" varchar,
	"description" text,
	"logo" varchar,
	"logo2" varchar,
	"favicon" varchar,
	"default_language" varchar(5) DEFAULT 'en',
	"supported_languages" jsonb DEFAULT '["en"]',
	"company_name" varchar,
	"company_website" varchar,
	"support_email" varchar,
	"currency" varchar(10) DEFAULT 'INR',
	"country" varchar(2) DEFAULT 'IN',
	"embedded_signup_enabled" boolean DEFAULT true,
	"public_origin" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"provider_key" varchar NOT NULL,
	"description" text,
	"logo" varchar,
	"is_active" boolean DEFAULT true,
	"config" jsonb,
	"supported_currencies" jsonb,
	"supported_methods" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payment_providers_provider_key_unique" UNIQUE("provider_key")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar,
	"popular" boolean DEFAULT false,
	"badge" varchar,
	"color" varchar,
	"button_color" varchar,
	"monthly_price" numeric(10, 2) DEFAULT '0',
	"annual_price" numeric(10, 2) DEFAULT '0',
	"permissions" jsonb,
	"features" jsonb,
	"stripe_product_id" varchar,
	"stripe_price_id_monthly" varchar,
	"stripe_price_id_annual" varchar,
	"razorpay_plan_id_monthly" varchar,
	"razorpay_plan_id_annual" varchar,
	"paypal_product_id" varchar,
	"paypal_plan_id_monthly" varchar,
	"paypal_plan_id_annual" varchar,
	"paystack_plan_code_monthly" varchar,
	"paystack_plan_code_annual" varchar,
	"mercadopago_plan_id_monthly" varchar,
	"mercadopago_plan_id_annual" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_languages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"native_name" varchar(100) NOT NULL,
	"icon" varchar(10),
	"direction" varchar(3) DEFAULT 'ltr' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"translations" jsonb DEFAULT '{}',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "platform_languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sent_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" varchar,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"widget_code" text NOT NULL,
	"widget_enabled" boolean DEFAULT true NOT NULL,
	"widget_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_training_config" jsonb DEFAULT '{"trainFromKB": false, "trainFromDocuments": true}'::jsonb NOT NULL,
	"auto_assignment_config" jsonb DEFAULT '{"enabled": false, "strategy": "round_robin"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_widget_code_unique" UNIQUE("widget_code")
);
--> statement-breakpoint
CREATE TABLE "smtp_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"secure" boolean DEFAULT false,
	"user" text NOT NULL,
	"password" text,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"logo" text DEFAULT 'null',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "storage_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'digitalocean',
	"space_name" text NOT NULL,
	"endpoint" text NOT NULL,
	"region" text NOT NULL,
	"access_key" text NOT NULL,
	"secret_key" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"plan_data" jsonb NOT NULL,
	"status" varchar NOT NULL,
	"billing_cycle" varchar NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"auto_renew" boolean DEFAULT true,
	"gateway_subscription_id" varchar,
	"gateway_provider" varchar,
	"gateway_status" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"creator_id" varchar NOT NULL,
	"creator_type" "user_type" NOT NULL,
	"creator_name" text NOT NULL,
	"creator_email" text NOT NULL,
	"assigned_to_id" varchar,
	"assigned_to_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"created_by" varchar,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"language" text DEFAULT 'en_US',
	"header" text,
	"body" text NOT NULL,
	"footer" text,
	"buttons" jsonb DEFAULT '[]'::jsonb,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft',
	"rejection_reason" text,
	"media_type" text DEFAULT 'text',
	"media_url" text,
	"media_handle" text,
	"carousel_cards" jsonb DEFAULT '[]'::jsonb,
	"whatsapp_template_id" text,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"header_type" text,
	"body_variables" integer,
	CONSTRAINT "template_channel_wa_id_unique" UNIQUE("whatsapp_template_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_type" "user_type" NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar NOT NULL,
	"site_id" varchar NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar,
	"type" text NOT NULL,
	"title" text,
	"content" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_qa_pairs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" varchar NOT NULL,
	"channel_id" varchar,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text DEFAULT 'general',
	"embedding" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" varchar NOT NULL,
	"channel_id" varchar,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"chunk_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"subscription_id" varchar,
	"payment_provider_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"billing_cycle" varchar NOT NULL,
	"provider_transaction_id" varchar,
	"provider_order_id" varchar,
	"provider_payment_id" varchar,
	"provider_subscription_id" varchar,
	"provider_payment_intent_id" varchar,
	"provider_setup_intent_id" varchar,
	"provider_invoice_id" varchar,
	"provider_customer_id" varchar,
	"status" varchar NOT NULL,
	"payment_method" varchar,
	"metadata" jsonb,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "update_run_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" varchar NOT NULL,
	"step" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"progress" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "update_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"triggered_by" varchar,
	"triggered_by_username" text,
	"from_version" text,
	"to_version" text,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"final_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" varchar,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"in_app_enabled" boolean DEFAULT true,
	"email_enabled" boolean DEFAULT true,
	"sound_enabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"avatar" text,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" text[] NOT NULL,
	"channel_id" varchar,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar,
	"fcm_token" varchar(512),
	"is_email_verified" boolean DEFAULT false,
	"stripe_customer_id" varchar,
	"razorpay_customer_id" varchar,
	"paypal_customer_id" varchar,
	"paystack_customer_code" varchar,
	"mercadopago_customer_id" varchar,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"webhook_url" text NOT NULL,
	"verify_token" varchar(100) NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_ping_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_business_accounts_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" text NOT NULL,
	"app_secret" text NOT NULL,
	"config_id" text NOT NULL,
	"created_by" varchar DEFAULT '',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"phone_number_id" varchar(50) NOT NULL,
	"waba_id" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"business_account_id" varchar(50),
	"rate_limit_tier" varchar(20) DEFAULT 'standard',
	"quality_rating" varchar(20) DEFAULT 'green',
	"status" varchar(20) DEFAULT 'inactive',
	"error_message" text,
	"last_health_check" timestamp with time zone,
	"message_limit" integer,
	"messages_used" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whatsapp_channels_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_edges" ADD CONSTRAINT "automation_edges_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_execution_id_automation_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."automation_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_nodes" ADD CONSTRAINT "automation_nodes_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_keys" ADD CONSTRAINT "client_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_keys" ADD CONSTRAINT "client_api_keys_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_usage_logs" ADD CONSTRAINT "client_api_usage_logs_api_key_id_client_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."client_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_usage_logs" ADD CONSTRAINT "client_api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_usage_logs" ADD CONSTRAINT "client_api_usage_logs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_webhooks" ADD CONSTRAINT "client_webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_webhooks" ADD CONSTRAINT "client_webhooks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_categories" ADD CONSTRAINT "knowledge_categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_queue" ADD CONSTRAINT "message_queue_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_queue" ADD CONSTRAINT "message_queue_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_data" ADD CONSTRAINT "training_data_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_provider_id_payment_providers_id_fk" FOREIGN KEY ("payment_provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_run_events" ADD CONSTRAINT "update_run_events_run_id_update_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."update_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_runs" ADD CONSTRAINT "update_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_edges_automation_idx" ON "automation_edges" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_execution_logs_execution_idx" ON "automation_execution_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "automation_executions_automation_idx" ON "automation_executions" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_executions_status_idx" ON "automation_executions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_executions_message_unique_idx" ON "automation_executions" USING btree ("automation_id","conversation_id","trigger_message_id");--> statement-breakpoint
CREATE INDEX "automation_nodes_automation_idx" ON "automation_nodes" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automations_channel_idx" ON "automations" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "automations_status_idx" ON "automations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recipients_campaign_idx" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "recipients_status_idx" ON "campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recipients_phone_idx" ON "campaign_recipients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "campaigns_channel_idx" ON "campaigns" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_created_idx" ON "campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contacts_channel_idx" ON "contacts" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_tenant_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversation_pins_user_idx" ON "conversation_pins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_pins_user_channel_idx" ON "conversation_pins" USING btree ("user_id","channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_pins_user_conv_uniq" ON "conversation_pins" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_channel_idx" ON "conversations" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "conversations_contact_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "conversations_phone_idx" ON "conversations" USING btree ("contact_phone");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_last_msg_idx" ON "conversations" USING btree ("channel_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_assigned_idx" ON "conversations" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "conversations_last_msg_at_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "knowledge_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "knowledge_articles" USING btree ("published");--> statement-breakpoint
CREATE INDEX "categories_site_idx" ON "knowledge_categories" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "knowledge_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_whatsapp_idx" ON "messages" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX "messages_direction_idx" ON "messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_conv_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_conv_status_created_idx" ON "messages" USING btree ("conversation_id","status","created_at");--> statement-breakpoint
CREATE INDEX "notifications_channel_idx" ON "notifications" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "templates_channel_idx" ON "templates" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "training_data_chatbot_idx" ON "training_data" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "update_run_events_run_id_idx" ON "update_run_events" USING btree ("run_id","id");--> statement-breakpoint
CREATE INDEX "update_runs_started_at_idx" ON "update_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "users_created_by_idx" ON "users" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
