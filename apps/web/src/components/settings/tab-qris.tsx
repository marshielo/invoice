'use client'

import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api-client'
import type { QRISData } from '@/lib/types'

interface Props {
  qris: QRISData | null
  token: string
  onChanged: () => void
}

export function TabQris({ qris, token, onChanged }: Props) {
  const t = useTranslations('settings')
  const [preview, setPreview] = useState<string | null>(qris?.imageUrl ?? null)
  const [banner, setBanner] = useState<'saved' | 'error' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiClient.upload('/api/v1/tenants/settings/qris', fd, token)
    },
    onSuccess: () => {
      setBanner('saved')
      onChanged()
      setTimeout(() => setBanner(null), 3000)
    },
    onError: () => setBanner('error'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    uploadMutation.mutate(file)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">{t('qris.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('qris.subtitle')}</p>
      </div>

      {banner === 'saved' && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{t('saved')}</div>
      )}
      {banner === 'error' && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {t('errors.uploadFailed')}
        </div>
      )}

      {/* Current QRIS preview */}
      {preview ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-foreground">{t('qris.active')}</span>
            </div>
            {qris?.nmid && (
              <span className="text-xs text-muted-foreground">
                {t('qris.nmid')}: {qris.nmid}
              </span>
            )}
          </div>
          <div className="flex justify-center p-6">
            <img
              src={preview}
              alt="QRIS"
              className="h-56 w-56 object-contain"
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted py-16">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-card">
            <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{t('qris.hint')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('qris.imageHint')}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
      >
        {uploadMutation.isPending
          ? t('qris.uploading')
          : preview
            ? t('qris.change')
            : t('qris.upload')}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
