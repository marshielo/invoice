import { eq } from 'drizzle-orm'
import { users } from '@invoicein/db/schema'
import type { MiddlewareHandler } from 'hono'
import { getDb } from '~/lib/db'
import { NotFoundError, UnauthorizedError } from '~/lib/errors'
import type { AppEnv } from '~/types/context'

/**
 * Resolves the tenant context from the authenticated user.
 * Must run AFTER authMiddleware.
 * Sets c.set('tenantId'), c.set('tenantSlug'), c.set('userRole').
 */
export const tenantMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new UnauthorizedError()
  }

  const db = getDb(c)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { tenant: true },
  })

  if (!user) {
    throw new NotFoundError('User')
  }
  if (!user.isActive) {
    throw new UnauthorizedError('Akun Anda telah dinonaktifkan')
  }
  if (!user.tenant) {
    throw new NotFoundError('Tenant')
  }

  c.set('tenantId', user.tenantId)
  c.set('tenantSlug', user.tenant.slug)
  c.set('userRole', user.role)

  await next()
}
