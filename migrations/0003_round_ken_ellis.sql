ALTER TABLE "storage_settings" ALTER COLUMN "provider" SET DEFAULT 'aws';--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "quarterly_price" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "stripe_price_id_quarterly" varchar;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "razorpay_plan_id_quarterly" varchar;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "paypal_plan_id_quarterly" varchar;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "paystack_plan_code_quarterly" varchar;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "mercadopago_plan_id_quarterly" varchar;