-- ============================================================
-- Invoices, Invoice Items, Invoice Payments tables (MAR-103)
-- ============================================================

CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid,
	"invoice_number" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"issue_date" date DEFAULT CURRENT_DATE NOT NULL,
	"due_date" date,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"terms" text,
	"pdf_url" varchar(500),
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_tenant_number_unique" UNIQUE("tenant_id", "invoice_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
	"unit" varchar(50),
	"unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_method" varchar(30),
	"payment_date" date NOT NULL,
	"reference_number" varchar(100),
	"proof_url" varchar(500),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_idx" ON "invoices" ("tenant_id", "status");--> statement-breakpoint
CREATE INDEX "invoices_tenant_client_idx" ON "invoices" ("tenant_id", "client_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_due_date_idx" ON "invoices" ("tenant_id", "due_date");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_order_idx" ON "invoice_items" ("invoice_id", "sort_order");--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_idx" ON "invoice_payments" ("invoice_id");--> statement-breakpoint

-- ============================================================
-- RLS — invoices
-- ============================================================
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own_tenant"
  ON "invoices" FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "invoices_insert_own_tenant"
  ON "invoices" FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "invoices_update_own_tenant"
  ON "invoices" FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "invoices_delete_own_tenant"
  ON "invoices" FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- ============================================================
-- RLS — invoice_items (via parent invoice)
-- ============================================================
ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_select_own_tenant"
  ON "invoice_items" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));

CREATE POLICY "invoice_items_insert_own_tenant"
  ON "invoice_items" FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));

CREATE POLICY "invoice_items_update_own_tenant"
  ON "invoice_items" FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));

CREATE POLICY "invoice_items_delete_own_tenant"
  ON "invoice_items" FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));

-- ============================================================
-- RLS — invoice_payments (via parent invoice)
-- ============================================================
ALTER TABLE "invoice_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_payments_select_own_tenant"
  ON "invoice_payments" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));

CREATE POLICY "invoice_payments_insert_own_tenant"
  ON "invoice_payments" FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));

CREATE POLICY "invoice_payments_delete_own_tenant"
  ON "invoice_payments" FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.tenant_id = auth.tenant_id()
  ));
