-- ============================================================
-- MAR-109 · E5-001: Payment Schema & Midtrans Transactions
-- ============================================================
-- 1. Extend invoice_payments with tenant_id, recorded_by, updated_at
-- 2. Add midtrans_transactions table
-- ============================================================

-- ── 1. Extend invoice_payments ────────────────────────────

ALTER TABLE "invoice_payments"
  ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "recorded_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Back-fill tenant_id from parent invoice (safe for existing rows)
UPDATE "invoice_payments" ip
SET "tenant_id" = i."tenant_id"
FROM "invoices" i
WHERE i."id" = ip."invoice_id"
  AND ip."tenant_id" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "invoice_payments"
  ALTER COLUMN "tenant_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "invoice_payments_tenant_idx" ON "invoice_payments" ("tenant_id");

-- updated_at trigger for invoice_payments
CREATE OR REPLACE FUNCTION update_invoice_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_payments_updated_at_trigger ON "invoice_payments";
CREATE TRIGGER invoice_payments_updated_at_trigger
  BEFORE UPDATE ON "invoice_payments"
  FOR EACH ROW EXECUTE FUNCTION update_invoice_payments_updated_at();

-- ── 2. midtrans_transactions ──────────────────────────────

CREATE TABLE IF NOT EXISTS "midtrans_transactions" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id"        uuid NOT NULL REFERENCES "public"."invoices"("id") ON DELETE CASCADE,
  "tenant_id"         uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "order_id"          varchar(100) NOT NULL UNIQUE,
  "snap_token"        text,
  "snap_redirect_url" text,
  "transaction_id"    varchar(100),
  "payment_type"      varchar(50),
  "gross_amount"      numeric(15, 2) NOT NULL,
  "status"            varchar(30) NOT NULL DEFAULT 'pending',
  "va_numbers"        jsonb,
  "fraud_status"      varchar(20),
  "midtrans_response" jsonb,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "midtrans_transactions_invoice_idx" ON "midtrans_transactions" ("invoice_id");
CREATE INDEX IF NOT EXISTS "midtrans_transactions_tenant_idx" ON "midtrans_transactions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "midtrans_transactions_order_id_idx" ON "midtrans_transactions" ("order_id");

-- updated_at trigger for midtrans_transactions
CREATE OR REPLACE FUNCTION update_midtrans_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS midtrans_transactions_updated_at_trigger ON "midtrans_transactions";
CREATE TRIGGER midtrans_transactions_updated_at_trigger
  BEFORE UPDATE ON "midtrans_transactions"
  FOR EACH ROW EXECUTE FUNCTION update_midtrans_transactions_updated_at();

-- ── 3. RLS — midtrans_transactions ───────────────────────

ALTER TABLE "midtrans_transactions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "midtrans_transactions_select_own_tenant"
  ON "midtrans_transactions" FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "midtrans_transactions_insert_own_tenant"
  ON "midtrans_transactions" FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "midtrans_transactions_update_own_tenant"
  ON "midtrans_transactions" FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "midtrans_transactions_delete_own_tenant"
  ON "midtrans_transactions" FOR DELETE
  USING (tenant_id = auth.tenant_id());
