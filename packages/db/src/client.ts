import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'
import { relations } from './relations.js'

export type Database = ReturnType<typeof createDb>

/**
 * Create a Drizzle client.
 * Works in Node.js (API server) and can be called per-request in Workers.
 *
 * @param connectionString - PostgreSQL connection string (from Supabase)
 * @param options - Optional config overrides
 */
export function createDb(
  connectionString: string,
  options: { max?: number } = {},
) {
  const client = postgres(connectionString, {
    max: options.max ?? 1, // 1 connection per request in Workers/serverless
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  })

  return drizzle(client, { schema: { ...schema, ...relations } })
}
