import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { errorHandler } from '~/middleware/error.middleware'
import { apiRateLimit } from '~/middleware/rate-limit.middleware'
import { authRoutes } from '~/routes/auth.routes'
import { healthRoutes } from '~/routes/health.routes'
import type { AppEnv } from '~/types/context'

const app = new Hono<AppEnv>()

// ---------- Security & logging ----------
app.use('*', secureHeaders())
app.use('*', timing())
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://invoicein.id',
        'https://app.invoicein.id',
      ]
      return allowed.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Server-Timing'],
    credentials: true,
    maxAge: 86400,
  }),
)

// Pretty JSON only in development
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT === 'development') {
    return prettyJSON()(c, next)
  }
  await next()
})

// ---------- Rate limiting on API routes ----------
app.use('/api/*', apiRateLimit)

// ---------- Routes ----------
app.route('/', healthRoutes)
app.route('/auth', authRoutes)

// Future routes (wired up as epics complete):
// app.route('/api/v1/tenants', tenantRoutes)
// app.route('/api/v1/clients', clientRoutes)
// app.route('/api/v1/products', productRoutes)
// app.route('/api/v1/invoices', invoiceRoutes)
// app.route('/api/v1/payments', paymentRoutes)
// app.route('/api/v1/quotations', quotationRoutes)
// app.route('/api/v1/ai', aiRoutes)
// app.route('/api/v1/dashboard', dashboardRoutes)
// app.route('/public', publicRoutes)
// app.route('/webhooks', webhookRoutes)

// ---------- Fallback ----------
app.notFound((c) =>
  c.json({ success: false, error: 'Endpoint tidak ditemukan', code: 'NOT_FOUND' }, 404),
)

// ---------- Global error handler ----------
app.onError(errorHandler)

export default app
