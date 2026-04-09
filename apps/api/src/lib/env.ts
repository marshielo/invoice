import { z } from 'zod'
import type { AppEnv } from '~/types/context'

const EnvSchema = z.object({
  ENVIRONMENT: z.string().default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  RESEND_API_KEY: z.string().default(''),
  FONNTE_API_KEY: z.string().default(''),
  FONNTE_DEVICE_ID: z.string().default(''),
  MIDTRANS_SERVER_KEY: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  MIDTRANS_IS_PRODUCTION: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  ANTHROPIC_API_KEY: z.string().default(''),
  R2_PUBLIC_URL: z.string().url().default('https://storage.invoicein.id'),
})

export type Env = z.infer<typeof EnvSchema>

/**
 * Validate and parse Worker bindings as typed environment.
 * Call once per request at the route handler level.
 */
export function parseEnv(bindings: AppEnv['Bindings']): Env {
  const result = EnvSchema.safeParse(bindings)
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
    throw new Error(`Invalid environment configuration: ${errors}`)
  }
  return result.data
}
