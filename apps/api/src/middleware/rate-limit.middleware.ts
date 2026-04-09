import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '~/types/context'

interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

/**
 * Simple in-memory rate limiter using a Map.
 * For production, replace with Cloudflare KV or Durable Objects.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function rateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
    const key = `${ip}:${c.req.path}`
    const now = Date.now()

    const entry = requestCounts.get(key)

    if (!entry || entry.resetAt < now) {
      requestCounts.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 })
      await next()
      return
    }

    if (entry.count >= options.limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      c.header('X-RateLimit-Limit', String(options.limit))
      c.header('X-RateLimit-Remaining', '0')
      return c.json(
        {
          success: false,
          error: 'Terlalu banyak permintaan. Coba lagi nanti.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        429,
      )
    }

    entry.count++
    c.header('X-RateLimit-Limit', String(options.limit))
    c.header('X-RateLimit-Remaining', String(options.limit - entry.count))
    await next()
  }
}

/** Default rate limit for authenticated API routes */
export const apiRateLimit = rateLimitMiddleware({ limit: 120, windowSeconds: 60 })

/** Stricter limit for AI endpoints */
export const aiRateLimit = rateLimitMiddleware({ limit: 10, windowSeconds: 60 })

/** Auth endpoints */
export const authRateLimit = rateLimitMiddleware({ limit: 10, windowSeconds: 60 })
