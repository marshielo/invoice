import { createClient } from '@supabase/supabase-js'
import type { Context } from 'hono'
import type { AppEnv } from '~/types/context'

/**
 * Creates a Supabase client authenticated as the service role.
 * This bypasses RLS — use only in server-side API code, never expose to clients.
 * Used for:
 *  - Validating user JWTs via supabase.auth.getUser()
 *  - Updating user app_metadata (e.g., storing tenant_id after tenant creation)
 *  - Inviting users, banning/unbanning accounts (E2-004)
 */
export function getSupabaseAdmin(c: Context<AppEnv>) {
  return createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Creates a Supabase client using the anon key.
 * Subject to RLS — safe for read operations where tenant isolation via RLS is sufficient.
 * In practice, the API mostly uses getSupabaseAdmin() for all operations since tenant
 * isolation is enforced at the application layer by tenant.middleware.ts.
 */
export function getSupabaseAnon(c: Context<AppEnv>) {
  return createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
