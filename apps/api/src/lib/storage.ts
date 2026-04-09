import type { Context } from 'hono'
import { createStorageService } from '~/services/storage.service'
import type { AppEnv } from '~/types/context'

/**
 * Get a StorageService instance from the Worker context.
 * Throws if R2_STORAGE binding or R2_PUBLIC_URL is not configured.
 */
export function getStorage(c: Context<AppEnv>) {
  const bucket = c.env.R2_STORAGE
  const publicUrl = c.env.R2_PUBLIC_URL

  if (!bucket) {
    throw new Error('R2_STORAGE binding is not configured')
  }
  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL environment variable is not configured')
  }

  return createStorageService(bucket, publicUrl)
}
