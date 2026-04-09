/**
 * Cloudflare R2 Storage Service
 */

export interface UploadOptions {
  contentType: string
  cacheControl?: string
  customMetadata?: Record<string, string>
}

export class StorageService {
  constructor(
    private readonly bucket: R2Bucket,
    private readonly publicUrl: string,
  ) {}

  async uploadFile(
    key: string,
    body: ArrayBuffer | ReadableStream | Blob | string,
    options: UploadOptions,
  ): Promise<string> {
    const putOptions: R2PutOptions = {
      httpMetadata: {
        contentType: options.contentType,
        cacheControl: options.cacheControl ?? 'public, max-age=31536000, immutable',
      },
    }
    if (options.customMetadata) {
      putOptions.customMetadata = options.customMetadata
    }
    await this.bucket.put(key, body, putOptions)
    return this.getPublicUrl(key)
  }

  async uploadBuffer(key: string, buffer: ArrayBuffer, contentType: string): Promise<string> {
    return this.uploadFile(key, buffer, { contentType })
  }

  async getMetadata(key: string): Promise<R2Object | null> {
    return this.bucket.head(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.bucket.head(key)) !== null
  }

  async getFile(key: string): Promise<ArrayBuffer | null> {
    const obj = await this.bucket.get(key)
    if (!obj) return null
    return obj.arrayBuffer()
  }

  async deleteFile(key: string): Promise<void> {
    await this.bucket.delete(key)
  }

  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return
    await this.bucket.delete(keys)
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let deleted = 0
    let cursor: string | undefined
    for (;;) {
      const listOpts: R2ListOptions = { prefix, limit: 1000 }
      if (cursor) listOpts.cursor = cursor
      const listed = await this.bucket.list(listOpts)
      const keys = listed.objects.map((o) => o.key)
      if (keys.length > 0) {
        await this.bucket.delete(keys)
        deleted += keys.length
      }
      if (!listed.truncated) break
      cursor = listed.cursor
    }
    return deleted
  }

  getSignedUrl(key: string, expiresInSeconds = 3600): string {
    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds
    return `${this.getPublicUrl(key)}?expires=${expiry}`
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`
  }

  static keys = {
    tenantLogo: (tenantId: string, ext: string) => `tenants/${tenantId}/logo.${ext}`,
    tenantQris: (tenantId: string, ext: string) => `tenants/${tenantId}/qris.${ext}`,
    invoicePdf: (tenantId: string, invoiceId: string) =>
      `invoices/${tenantId}/${invoiceId}/invoice.pdf`,
    quotationPdf: (tenantId: string, quotationId: string) =>
      `quotations/${tenantId}/${quotationId}/quotation.pdf`,
    paymentProof: (tenantId: string, paymentId: string, ext: string) =>
      `payments/${tenantId}/${paymentId}/proof.${ext}`,
    expenseReceipt: (tenantId: string, expenseId: string, ext: string) =>
      `receipts/${tenantId}/${expenseId}/receipt.${ext}`,
  } as const
}

export function createStorageService(bucket: R2Bucket, publicUrl: string): StorageService {
  return new StorageService(bucket, publicUrl)
}

export function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  return map[contentType] ?? 'bin'
}

export function validateUpload(
  contentType: string,
  sizeBytes: number,
  options: { allowedTypes: readonly string[]; maxSizeBytes: number },
): { valid: true } | { valid: false; error: string } {
  if (!options.allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Tipe file tidak didukung. Diizinkan: ${options.allowedTypes.join(', ')}`,
    }
  }
  if (sizeBytes > options.maxSizeBytes) {
    const maxMb = (options.maxSizeBytes / 1024 / 1024).toFixed(1)
    return { valid: false, error: `Ukuran file terlalu besar. Maksimal ${maxMb} MB` }
  }
  return { valid: true }
}

export const UPLOAD_LIMITS = {
  logo: {
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const,
    maxSizeBytes: 2 * 1024 * 1024,
  },
  qris: {
    allowedTypes: ['image/png', 'image/jpeg'] as const,
    maxSizeBytes: 1 * 1024 * 1024,
  },
  paymentProof: {
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const,
    maxSizeBytes: 5 * 1024 * 1024,
  },
  expenseReceipt: {
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const,
    maxSizeBytes: 5 * 1024 * 1024,
  },
} as const
