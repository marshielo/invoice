CREATE TYPE "public"."business_type" AS ENUM('florist', 'freelancer', 'workshop', 'retail', 'food_beverage', 'fashion', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'professional', 'business');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'staff', 'viewer');--> statement-breakpoint
CREATE TABLE "tenant_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_number" varchar(100) NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"bank_code" varchar(20),
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_qris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"qris_image_url" varchar(500) NOT NULL,
	"qris_nmid" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(63) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"postal_code" varchar(10),
	"npwp" varchar(30),
	"business_type" "business_type" DEFAULT 'other',
	"logo_url" varchar(500),
	"subscription_plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"subscription_expires_at" timestamp with time zone,
	"invoice_prefix" varchar(20) DEFAULT 'INV' NOT NULL,
	"invoice_format" varchar(50) DEFAULT '{PREFIX}/{YYYY}/{MM}/{SEQ}' NOT NULL,
	"invoice_sequence_counter" integer DEFAULT 0 NOT NULL,
	"quotation_prefix" varchar(20) DEFAULT 'QUO' NOT NULL,
	"quotation_sequence_counter" integer DEFAULT 0 NOT NULL,
	"credit_note_prefix" varchar(20) DEFAULT 'CN' NOT NULL,
	"credit_note_sequence_counter" integer DEFAULT 0 NOT NULL,
	"default_currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"default_payment_terms_days" integer DEFAULT 14 NOT NULL,
	"default_notes" text,
	"default_terms" text,
	"ppn_enabled" boolean DEFAULT true NOT NULL,
	"ppn_rate" numeric(5, 2) DEFAULT '11.00' NOT NULL,
	"branding" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"avatar_url" varchar(500),
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"locale" varchar(5) DEFAULT 'id' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tenant_bank_accounts" ADD CONSTRAINT "tenant_bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_qris" ADD CONSTRAINT "tenant_qris_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;