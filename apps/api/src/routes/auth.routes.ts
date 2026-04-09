import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { users } from '@invoicein/db/schema'
import { getDb } from '~/lib/db'
import { authMiddleware } from '~/middleware/auth.middleware'
import { authRateLimit } from '~/middleware/rate-limit.middleware'
import type { AppEnv } from '~/types/context'

export const authRoutes = new Hono<AppEnv>()

// Rate-limit all auth endpoints
authRoutes.use('*', authRateLimit)

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user's info + tenant context.
 *
 * Response shape:
 *   hasTenant: false  → user authenticated but hasn't completed onboarding (no tenant yet)
 *   hasTenant: true   → user has a tenant, returns user + tenant summary
 *
 * Used by the frontend after login to decide whether to redirect to
 * /onboarding (no tenant) or /dashboard (has tenant).
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')

  const db = getDb(c)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { tenant: true },
  })

  // User authenticated but hasn't created a tenant yet (post-signup, pre-onboarding)
  if (!user) {
    return c.json({
      success: true as const,
      data: {
        id: userId,
        email: userEmail,
        hasTenant: false as const,
      },
    })
  }

  return c.json({
    success: true as const,
    data: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      locale: user.locale,
      hasTenant: true as const,
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            slug: user.tenant.slug,
            name: user.tenant.name,
            subscriptionPlan: user.tenant.subscriptionPlan,
            logoUrl: user.tenant.logoUrl ?? null,
          }
        : null,
    },
  })
})

/**
 * POST /api/v1/auth/logout
 * Supabase JWT-based auth: logout is handled client-side by clearing the session.
 * This endpoint exists as a server-side hook for future session invalidation needs
 * (e.g., blocklist, audit log).
 */
authRoutes.post('/logout', authMiddleware, async (c) => {
  // Future: add token to a blocklist in KV, log the logout event, etc.
  return c.json({ success: true as const, data: { message: 'Berhasil keluar' } })
})
