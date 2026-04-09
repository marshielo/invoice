import { createDb } from '@invoicein/db'
import type { Context } from 'hono'
import type { AppEnv } from '~/types/context'

/**
 * Get a Drizzle database client for the current request.
 * Creates a new connection per-request (required for Cloudflare Workers).
 */
export function getDb(c: Context<AppEnv>) {
  const connectionString = c.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }
  return createDb(connectionString, { max: 1 })
}
