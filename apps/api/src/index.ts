import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import type { AppEnv } from '~/types/context'

const app = new Hono<AppEnv>()

// ---------- Global middleware ----------
app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:3000',
        'https://invoicein.id',
        'https://app.invoicein.id',
      ]
      return allowed.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

// ---------- Health check ----------
app.get('/health', (c) => {
  return c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

// ---------- API v1 routes (to be wired up as epics complete) ----------
app.get('/api/v1', (c) => {
  return c.json({ message: 'Invoicein API v1' })
})

// ---------- 404 fallback ----------
app.notFound((c) => {
  return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
})

// ---------- Global error handler ----------
app.onError((err, c) => {
  console.error('[API Error]', err)
  return c.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(c.env.ENVIRONMENT === 'development' && { detail: err.message }),
    },
    500,
  )
})

export default app
