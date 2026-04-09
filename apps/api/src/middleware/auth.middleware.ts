import type { MiddlewareHandler } from 'hono'
import { getSupabaseAdmin } from '~/lib/supabase'
import { UnauthorizedError } from '~/lib/errors'
import type { AppEnv } from '~/types/context'

/**
 * Validates the Bearer JWT from the Authorization header using Supabase Admin.
 * On success, sets c.set('userId') and c.set('userEmail').
 * On failure, throws UnauthorizedError (caught by errorHandler).
 *
 * Must run before tenantMiddleware and any route that requires authentication.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token autentikasi tidak ditemukan')
  }

  const token = authHeader.slice(7)
  if (!token) {
    throw new UnauthorizedError('Token autentikasi kosong')
  }

  const supabase = getSupabaseAdmin(c)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new UnauthorizedError('Token tidak valid atau sudah kadaluwarsa')
  }

  c.set('userId', data.user.id)
  c.set('userEmail', data.user.email ?? '')

  await next()
}
