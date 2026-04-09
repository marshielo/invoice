export type AppEnv = {
  Bindings: {
    // Cloudflare bindings
    R2_STORAGE: R2Bucket
    QUEUE_NOTIFICATIONS: Queue
    QUEUE_PDF: Queue

    // Environment variables (set as Wrangler secrets in prod)
    ENVIRONMENT: string
    DATABASE_URL: string
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string
    RESEND_API_KEY: string
    FONNTE_API_KEY: string
    FONNTE_DEVICE_ID: string
    MIDTRANS_SERVER_KEY: string
    MIDTRANS_CLIENT_KEY: string
    MIDTRANS_IS_PRODUCTION: string
    ANTHROPIC_API_KEY: string
    R2_PUBLIC_URL: string
  }
  Variables: {
    userId: string
    userEmail: string
    tenantId: string
    tenantSlug: string
    userRole: string
  }
}
