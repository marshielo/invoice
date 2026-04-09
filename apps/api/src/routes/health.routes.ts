import { Hono } from 'hono'
import type { AppEnv } from '~/types/context'

export const healthRoutes = new Hono<AppEnv>()

healthRoutes.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      version: '1.0.0',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
    },
  })
})
