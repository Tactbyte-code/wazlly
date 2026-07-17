ALTER TABLE "plans" ADD COLUMN "multi_currency_prices" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_subscription_id" varchar;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_payment_intent_id" varchar;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_setup_intent_id" varchar;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_invoice_id" varchar;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_customer_id" varchar;