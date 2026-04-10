-- ============================================================
-- Clients & Products tables (MAR-99, MAR-100)
-- ============================================================

CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"postal_code" varchar(20),
	"npwp" varchar(30),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"unit" varchar(50),
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"product_type" varchar(20) DEFAULT 'product' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_tenant_name_idx" ON "clients" ("tenant_id", "name");--> statement-breakpoint
CREATE INDEX "products_tenant_name_idx" ON "products" ("tenant_id", "name");--> statement-breakpoint
CREATE INDEX "products_tenant_active_idx" ON "products" ("tenant_id", "is_active");--> statement-breakpoint

-- ============================================================
-- RLS — clients
-- ============================================================
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own_tenant"
  ON "clients" FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "clients_insert_own_tenant"
  ON "clients" FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "clients_update_own_tenant"
  ON "clients" FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "clients_delete_own_tenant"
  ON "clients" FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- ============================================================
-- RLS — products
-- ============================================================
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_own_tenant"
  ON "products" FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "products_insert_own_tenant"
  ON "products" FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "products_update_own_tenant"
  ON "products" FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "products_delete_own_tenant"
  ON "products" FOR DELETE
  USING (tenant_id = auth.tenant_id());
