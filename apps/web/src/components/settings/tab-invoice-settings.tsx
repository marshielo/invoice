'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api-client'
import { INVOICE_NUMBER_FORMATS, PAYMENT_TERMS_OPTIONS } from '@invoicein/shared/constants'
import type { SettingsData } from '@/lib/types'

const inputCls =
  'mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted'
const labelCls = 'block text-sm font-medium text-foreground'
const errorCls = 'mt-1 text-xs text-red-600'

const schema = z.object({
  invoicePrefix: z.string().min(1),
  invoiceFormat: z.string().min(1),
  quotationPrefix: z.string().min(1),
  creditNotePrefix: z.string().min(1),
  defaultPaymentTermsDays: z.coerce.number().int().min(0),
  ppnEnabled: z.boolean(),
  ppnRate: z.string().optional(),
  defaultNotes: z.string().optional(),
  defaultTerms: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function previewNumber(prefix: string, format: string): string {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return format
    .replace('{PREFIX}', prefix || 'INV')
    .replace('{YYYY}', yyyy)
    .replace('{MM}', mm)
    .replace('{SEQ}', '0001')
}

interface Props {
  settings: SettingsData
  token: string
  onSaved: () => void
}

export function TabInvoiceSettings({ settings, token, onSaved }: Props) {
  const t = useTranslations('settings')
  const [banner, setBanner] = useState<'saved' | 'error' | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoicePrefix: settings.invoicePrefix,
      invoiceFormat: settings.invoiceFormat,
      quotationPrefix: settings.quotationPrefix,
      creditNotePrefix: settings.creditNotePrefix,
      defaultPaymentTermsDays: settings.defaultPaymentTermsDays,
      ppnEnabled: settings.ppnEnabled,
      ppnRate: settings.ppnRate ?? '11',
      defaultNotes: settings.defaultNotes ?? '',
      defaultTerms: settings.defaultTerms ?? '',
    },
  })

  // Live invoice number preview
  const watchedPrefix = useWatch({ control, name: 'invoicePrefix' })
  const watchedFormat = useWatch({ control, name: 'invoiceFormat' })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiClient.patch('/api/v1/tenants/settings', data, token),
    onSuccess: () => {
      setBanner('saved')
      onSaved()
      setTimeout(() => setBanner(null), 3000)
    },
    onError: () => setBanner('error'),
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">{t('invoiceSettings.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('invoiceSettings.subtitle')}</p>
      </div>

      {banner === 'saved' && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{t('saved')}</div>
      )}
      {banner === 'error' && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {t('errors.saveFailed')}
        </div>
      )}

      <form
        onSubmit={handleSubmit((d) => { setBanner(null); mutation.mutate(d) })}
        className="space-y-6"
      >
        {/* Invoice numbering */}
        <section className="rounded-xl border border-border p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t('invoiceSettings.invoicePrefix')} &amp; {t('invoiceSettings.invoiceFormat')}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                {t('invoiceSettings.invoicePrefix')} <span className="text-red-500">*</span>
              </label>
              <input
                {...register('invoicePrefix')}
                className={inputCls}
                placeholder="INV"
                disabled={mutation.isPending}
              />
              {errors.invoicePrefix && <p className={errorCls}>{t('errors.prefixRequired')}</p>}
            </div>
            <div>
              <label className={labelCls}>{t('invoiceSettings.invoiceFormat')}</label>
              <select {...register('invoiceFormat')} className={inputCls} disabled={mutation.isPending}>
                {INVOICE_NUMBER_FORMATS.map((f) => (
                  <option key={f.id} value={f.format}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">
                {t('invoiceSettings.preview')}:{' '}
                <span className="font-mono font-semibold text-primary">
                  {previewNumber(watchedPrefix, watchedFormat)}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Other prefixes */}
        <section className="rounded-xl border border-border p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t('invoiceSettings.quotationPrefix')} / {t('invoiceSettings.creditNotePrefix')}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('invoiceSettings.quotationPrefix')}</label>
              <input
                {...register('quotationPrefix')}
                className={inputCls}
                placeholder="QUO"
                disabled={mutation.isPending}
              />
            </div>
            <div>
              <label className={labelCls}>{t('invoiceSettings.creditNotePrefix')}</label>
              <input
                {...register('creditNotePrefix')}
                className={inputCls}
                placeholder="CN"
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </section>

        {/* Payment terms + PPN */}
        <section className="rounded-xl border border-border p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t('invoiceSettings.defaultPaymentTerms')} &amp; {t('invoiceSettings.ppnEnabled')}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('invoiceSettings.defaultPaymentTerms')}</label>
              <select
                {...register('defaultPaymentTermsDays')}
                className={inputCls}
                disabled={mutation.isPending}
              >
                {PAYMENT_TERMS_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  {...register('ppnEnabled')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  disabled={mutation.isPending}
                />
                {t('invoiceSettings.ppnEnabled')}
              </label>
              <div>
                <label className={labelCls}>{t('invoiceSettings.ppnRate')}</label>
                <input
                  {...register('ppnRate')}
                  className={inputCls}
                  placeholder="11"
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Default notes / terms */}
        <section className="rounded-xl border border-border p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t('invoiceSettings.defaultNotes')} &amp; {t('invoiceSettings.defaultTerms')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>
                {t('invoiceSettings.defaultNotes')}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t('invoiceSettings.defaultNotesHint')})
                </span>
              </label>
              <textarea
                {...register('defaultNotes')}
                rows={3}
                className={`${inputCls} resize-none`}
                disabled={mutation.isPending}
              />
            </div>
            <div>
              <label className={labelCls}>
                {t('invoiceSettings.defaultTerms')}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t('invoiceSettings.defaultTermsHint')})
                </span>
              </label>
              <textarea
                {...register('defaultTerms')}
                rows={3}
                className={`${inputCls} resize-none`}
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </section>

        <div>
          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? t('invoiceSettings.saving') : t('invoiceSettings.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
