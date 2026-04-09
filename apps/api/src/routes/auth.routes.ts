import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authRateLimit } from '~/middleware/rate-limit.middleware'
import type { AppEnv } from '~/types/context'

export const authRoutes = new Hono<AppEnv>()

// Rate-limit all auth endpoints
authRoutes.use('*', authRateLimit)

/**
 * GET /auth/me
 * Returns the currently authenticated user's info.
 * Used by the frontend after login to bootstrap the session.
 */
authRoutes.get('/me', async (c) => {
  // Auth middleware not yet applied here — will be wired in E2-001
  // This is a placeholder that returns 401 until auth is configured
  return c.json(
    { success: false, error: 'Autentikasi diperlukan', code: 'UNAUTHORIZED' },
    401,
  )
})

/**
 * POST /auth/logout
 * Invalidates the session on the server side (if needed).
 * For Supabase JWT, logout is handled client-side; this is a no-op for now.
 */
authRoutes.post(
  '/logout',
  zValidator('json', z.object({ userId: z.string().uuid().optional() })),
  async (c) => {
    return c.json({ success: true, data: { message: 'Berhasil keluar' } })
  },
)
