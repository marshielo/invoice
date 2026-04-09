import type { Context } from 'hono'
import { Hono } from 'hono'
import { authMiddleware } from '~/middleware/auth.middleware'
import { tenantMiddleware } from '~/middleware/tenant.middleware'
import { getStorage } from '~/lib/storage'
import {
  extFromContentType,
  validateUpload,
  UPLOAD_LIMITS,
  StorageService,
} from '~/services/storage.service'
import { ValidationError } from '~/lib/errors'
import type { AppEnv } from '~/types/context'

export const uploadRoutes = new Hono<AppEnv>()

uploadRoutes.use('*', authMiddleware)
uploadRoutes.use('*', tenantMiddleware)

// -------------------------------------------------------
// Helper — extract and validate a File from FormData
// -------------------------------------------------------
interface FileEntry {
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

async function extractFile(
  c: Context<AppEnv>,
  limits: { allowedTypes: readonly string[]; maxSizeBytes: number },
): Promise<FileEntry> {
  const formData = await c.req.formData()
  const entry = formData.get('file')

  // Cloudflare Workers doesn't expose global File; duck-type the Blob interface
  if (!entry || typeof entry === 'string' || typeof (entry as Record<string, unknown>)['arrayBuffer'] !== 'function') {
    throw new ValidationError('File tidak ditemukan dalam request')
  }

  const fileEntry = entry as unknown as FileEntry
  const contentType = fileEntry.type || 'application/octet-stream'
  const validation = validateUpload(contentType, fileEntry.size, limits)
  if (!validation.valid) throw new ValidationError(validation.error)

  return fileEntry
}

// -------------------------------------------------------
// POST /api/v1/upload/logo
// -------------------------------------------------------
uploadRoutes.post('/logo', async (c) => {
  const tenantId = c.get('tenantId')
  const storage = getStorage(c)
  const file = await extractFile(c, UPLOAD_LIMITS.logo)
  const ext = extFromContentType(file.type)
  const key = StorageService.keys.tenantLogo(tenantId, ext)
  const url = await storage.uploadBuffer(key, await file.arrayBuffer(), file.type)
  return c.json({ success: true, data: { url, key } })
})

// -------------------------------------------------------
// POST /api/v1/upload/qris
// -------------------------------------------------------
uploadRoutes.post('/qris', async (c) => {
  const tenantId = c.get('tenantId')
  const storage = getStorage(c)
  const file = await extractFile(c, UPLOAD_LIMITS.qris)
  const ext = extFromContentType(file.type)
  const key = StorageService.keys.tenantQris(tenantId, ext)
  const url = await storage.uploadBuffer(key, await file.arrayBuffer(), file.type)
  return c.json({ success: true, data: { url, key } })
})

// -------------------------------------------------------
// POST /api/v1/upload/payment-proof/:paymentId
// -------------------------------------------------------
uploadRoutes.post('/payment-proof/:paymentId', async (c) => {
  const tenantId = c.get('tenantId')
  const paymentId = c.req.param('paymentId')
  const storage = getStorage(c)
  const file = await extractFile(c, UPLOAD_LIMITS.paymentProof)
  const ext = extFromContentType(file.type)
  const key = StorageService.keys.paymentProof(tenantId, paymentId, ext)
  const url = await storage.uploadBuffer(key, await file.arrayBuffer(), file.type)
  return c.json({ success: true, data: { url, key } })
})

// -------------------------------------------------------
// DELETE /api/v1/upload/:encodedKey
// encodedKey = base64url of the R2 key
// -------------------------------------------------------
uploadRoutes.delete('/:encodedKey', async (c) => {
  const tenantId = c.get('tenantId')
  const encodedKey = c.req.param('encodedKey')
  const key = atob(encodedKey.replace(/-/g, '+').replace(/_/g, '/'))

  // Security: key must belong to this tenant
  if (!key.includes(`/${tenantId}/`)) {
    throw new ValidationError('Tidak dapat menghapus file milik tenant lain')
  }

  const storage = getStorage(c)
  await storage.deleteFile(key)
  return c.json({ success: true, data: { deleted: key } })
})
