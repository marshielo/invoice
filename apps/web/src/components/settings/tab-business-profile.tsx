'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api-client'
import { INDONESIAN_PROVINCES } from '@invoicein/shared/constants'
import type { SettingsData } from '@/lib/types'

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50'
const labelCls = 'block text-sm font-medium text-gray-700'
const errorCls = 'mt-1 text-xs text-red-600'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  npwp: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  settings: SettingsData
  token: string
  onSaved: () => void
}

export function TabBusinessProfile({ settings, token, onSaved }: Props) {
  const t = useTranslations('settings')
  const [banner, setBanner] = useState<'saved' | 'error' | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: settings.name,
      email: settings.email,
      phone: settings.phone ?? '',
      address: settings.address ?? '',
      city: settings.city ?? '',
      province: settings.province ?? '',
      postalCode: settings.postalCode ?? '',
      npwp: settings.npwp ?? '',
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiClient.patch('/api/v1/tenants/settings', data, token),
    onSuccess: () => {
      setBanner('saved')
      onSaved()
      setTimeout(() => setBanner(null), 3000)
    },
    onError: () => setBanner('error'),
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiClient.upload('/api/v1/tenants/settings/logo', fd, token)
    },
    onSuccess: () => {
      setBanner('saved')
      onSaved()
      setTimeout(() => setBanner(null), 3000)
    },
    onError: () => setBanner('error'),
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    logoMutation.mutate(file)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('businessProfile.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('businessProfile.subtitle')}</p>
      </div>

      {banner === 'saved' && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{t('saved')}</div>
      )}
      {banner === 'error' && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {t('errors.saveFailed')}
        </div>
      )}

      {/* Logo section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{t('businessProfile.logo')}</p>
          <p className="mt-0.5 text-xs text-gray-400">{t('businessProfile.logoHint')}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={logoMutation.isPending}
            className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {logoMutation.isPending
              ? t('businessProfile.uploading')
              : logoPreview
                ? t('businessProfile.changeLogo')
                : t('businessProfile.uploadLogo')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit((d) => { setBanner(null); saveMutation.mutate(d) })}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className={labelCls}>
              {t('businessProfile.name')} <span className="text-red-500">*</span>
            </label>
            <input {...register('name')} className={inputCls} disabled={saveMutation.isPending} />
            {errors.name && <p className={errorCls}>{t('errors.nameRequired')}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>
              {t('businessProfile.email')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              className={inputCls}
              disabled={saveMutation.isPending}
            />
            {errors.email && (
              <p className={errorCls}>
                {errors.email.type === 'invalid_string'
                  ? t('errors.emailInvalid')
                  : t('errors.emailRequired')}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>{t('businessProfile.phone')}</label>
            <input
              {...register('phone')}
              type="tel"
              className={inputCls}
              disabled={saveMutation.isPending}
            />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className={labelCls}>{t('businessProfile.address')}</label>
            <input {...register('address')} className={inputCls} disabled={saveMutation.isPending} />
          </div>

          {/* City */}
          <div>
            <label className={labelCls}>{t('businessProfile.city')}</label>
            <input {...register('city')} className={inputCls} disabled={saveMutation.isPending} />
          </div>

          {/* Province */}
          <div>
            <label className={labelCls}>{t('businessProfile.province')}</label>
            <select {...register('province')} className={inputCls} disabled={saveMutation.isPending}>
              <option value="">—</option>
              {INDONESIAN_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Postal Code */}
          <div>
            <label className={labelCls}>{t('businessProfile.postalCode')}</label>
            <input
              {...register('postalCode')}
              className={inputCls}
              disabled={saveMutation.isPending}
            />
          </div>

          {/* NPWP */}
          <div>
            <label className={labelCls}>{t('businessProfile.npwp')}</label>
            <input {...register('npwp')} className={inputCls} disabled={saveMutation.isPending} />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending || !isDirty}
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveMutation.isPending ? t('businessProfile.saving') : t('businessProfile.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
