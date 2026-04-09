-- ============================================================
-- Row-Level Security Policies
-- Enforces tenant isolation for direct Supabase client access.
-- The Hono API uses the service role (bypasses RLS by design);
-- the API enforces isolation at the application layer via
-- tenant.middleware.ts. RLS is a defense-in-depth layer.
-- ============================================================

-- Helper function: extract tenant_id from JWT app_metadata
-- The API sets this via supabase.auth.admin.updateUserById()
-- after tenant creation (E2-002).
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    ''
  )::uuid
$$;

-- ============================================================
-- tenants
-- ============================================================
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;

-- Users can read their own tenant
CREATE POLICY "tenants_select_own"
  ON "tenants"
  FOR SELECT
  USING (id = auth.tenant_id());

-- Users can update their own tenant
-- (fine-grained role checks are enforced at the API layer)
CREATE POLICY "tenants_update_own"
  ON "tenants"
  FOR UPDATE
  USING (id = auth.tenant_id())
  WITH CHECK (id = auth.tenant_id());

-- ============================================================
-- users
-- ============================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Users can read all users in their tenant
CREATE POLICY "users_select_own_tenant"
  ON "users"
  FOR SELECT
  USING (tenant_id = auth.tenant_id());

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON "users"
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- tenant_bank_accounts
-- ============================================================
ALTER TABLE "tenant_bank_accounts" ENABLE ROW LEVEL SECURITY;

-- Users can read their tenant's bank accounts
CREATE POLICY "tenant_bank_accounts_select_own_tenant"
  ON "tenant_bank_accounts"
  FOR SELECT
  USING (tenant_id = auth.tenant_id());

-- ============================================================
-- tenant_qris
-- ============================================================
ALTER TABLE "tenant_qris" ENABLE ROW LEVEL SECURITY;

-- Users can read their tenant's QRIS codes
CREATE POLICY "tenant_qris_select_own_tenant"
  ON "tenant_qris"
  FOR SELECT
  USING (tenant_id = auth.tenant_id());
