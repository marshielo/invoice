import type { ErrorHandler } from 'hono'
import { ZodError } from 'zod'
import { AppError } from '~/lib/errors'
import type { AppEnv } from '~/types/context'

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const isDev = c.env.ENVIRONMENT === 'development'

  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root'
      details[key] ??= []
      details[key]!.push(issue.message)
    }
    return c.json(
      {
        success: false,
        error: 'Data tidak valid',
        code: 'VALIDATION_ERROR',
        details,
      },
      422,
    )
  }

  // Known application errors
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
        ...(isDev && { stack: err.stack }),
      },
      err.status as Parameters<typeof c.json>[1],
    )
  }

  // Unknown errors
  console.error('[Unhandled Error]', err)
  return c.json(
    {
      success: false,
      error: 'Terjadi kesalahan internal',
      code: 'INTERNAL_ERROR',
      ...(isDev && { detail: err instanceof Error ? err.message : String(err) }),
    },
    500,
  )
}
