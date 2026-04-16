import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: [
    // Match all pathnames except for
    // - files with an extension (e.g. favicon.ico)
    // - _next internal paths
    // - api routes
    // - auth/callback (Supabase OAuth handler — must not be locale-prefixed)
    '/((?!_next|api|auth/callback|.*\\..*).*)',
  ],
}
