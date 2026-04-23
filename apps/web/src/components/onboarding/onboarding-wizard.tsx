'use client'

import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiClient, ApiError } from '@/lib/api-client'
import {
  INDONESIAN_BANKS,
  INVOICE_NUMBER_FORMATS,
  PAYMENT_TERMS_OPTIONS,
} from '@invoicein/shared/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'businessInfo' | 'bankAccount' | 'logo' | 'invoicePrefs'
const STEPS: Step[] = ['businessInfo', 'bankAccount', 'logo', 'invoicePrefs']

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface TenantCreatedData {
  tenant: { id: string; slug: string }
}

// ─── Slugify helper ───────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const businessInfoSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/),
  businessType: z.enum(['florist', 'freelancer', 'workshop', 'retail', 'food_beverage', 'fashion', 'service', 'other']),
  email: z.string().email(),
  phone: z.string().optional(),
})

const bankAccountSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().min(1),
  accountHolderName: z.string().min(1),
})

const invoicePrefsSchema = z.object({
  invoicePrefix: z.string().min(1),
  invoiceFormat: z.string().min(1),
  defaultPaymentTermsDays: z.coerce.number(),
  defaultNotes: z.string().optional(),
})

type BusinessInfoForm = z.infer<typeof businessInfoSchema>
type BankAccountForm = z.infer<typeof bankAccountSchema>
type InvoicePrefsForm = z.infer<typeof invoicePrefsSchema>

// ─── Shared input styles ─────────────────────────────────────────────────────

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50'
const labelCls = 'block text-sm font-medium text-gray-700'
const errorCls = 'mt-1 text-xs text-red-600'

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  labels,
}: {
  currentStep: number
  labels: string[]
}) {
  return (
    <ol className="mb-8 flex items-center gap-0">
      {labels.map((label, i) => {
        const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'
        return (
          <li key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  state === 'done'
                    ? 'bg-sky-600 text-white'
                    : state === 'active'
                      ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {state === 'done' ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-xs sm:block ${state === 'active' ? 'font-semibold text-sky-700' : 'text-gray-400'}`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={`mb-4 h-0.5 flex-1 transition-colors ${i < currentStep ? 'bg-sky-600' : 'bg-gray-200'}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// ─── Step 1: Business Info ────────────────────────────────────────────────────

function StepBusinessInfo({
  onSuccess,
}: {
  onSuccess: (tenantId: string, token: string) => void
}) {
  const t = useTranslations('onboarding')
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusinessInfoForm>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: { businessType: 'other', invoicePrefix: 'INV' } as Partial<BusinessInfoForm>,
  })

  const nameValue = watch('name')

  const mutation = useMutation({
    mutationFn: async (data: BusinessInfoForm) => {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await apiClient.post<ApiResponse<TenantCreatedData>>(
        '/api/v1/tenants/',
        {
          name: data.name,
          slug: data.slug,
          businessType: data.businessType,
          email: data.email,
          phone: data.phone?.trim() || null,
          fullName: data.name, // placeholder; user sets later in profile settings
        },
        token,
      )
      return { tenantId: res.data.tenant.id, token }
    },
    onSuccess: ({ tenantId, token }) => onSuccess(tenantId, token),
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setApiError(t('errors.slugTaken'))
      } else {
        setApiError(t('errors.createTenantFailed'))
      }
    },
  })

  const handleNameBlur = () => {
    const current = (document.getElementById('slug') as HTMLInputElement)?.value
    if (!current) {
      setValue('slug', slugify(nameValue ?? ''))
    }
  }

  return (
    <Card title={t('businessInfo.title')} subtitle={t('businessInfo.subtitle')}>
      {apiError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{apiError}</div>
      )}
      <form onSubmit={handleSubmit((d) => { setApiError(null); mutation.mutate(d) })} className="space-y-4">
        {/* Business Name */}
        <div>
          <label htmlFor="name" className={labelCls}>
            {t('businessInfo.businessName')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            id="name"
            className={inputCls}
            placeholder={t('businessInfo.businessNamePlaceholder')}
            onBlur={handleNameBlur}
            disabled={mutation.isPending}
          />
          {errors.name && <p className={errorCls}>{t('errors.businessNameRequired')}</p>}
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className={labelCls}>
            {t('businessInfo.slug')} <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex rounded-lg shadow-sm ring-1 ring-gray-300 focus-within:ring-2 focus-within:ring-sky-500">
            <span className="flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 text-xs text-gray-400 select-none">
              {t('businessInfo.slugPrefix')}
            </span>
            <input
              {...register('slug')}
              id="slug"
              className="block flex-1 rounded-r-lg border-0 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none disabled:bg-gray-50"
              placeholder="toko-maju-jaya"
              disabled={mutation.isPending}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">{t('businessInfo.slugHint')}</p>
          {errors.slug && (
            <p className={errorCls}>
              {errors.slug.type === 'too_small'
                ? t('errors.slugTooShort')
                : t('errors.slugInvalid')}
            </p>
          )}
        </div>

        {/* Business Type */}
        <div>
          <label htmlFor="businessType" className={labelCls}>
            {t('businessInfo.businessType')} <span className="text-red-500">*</span>
          </label>
          <select
            {...register('businessType')}
            id="businessType"
            className={inputCls}
            disabled={mutation.isPending}
          >
            {(['florist', 'freelancer', 'workshop', 'retail', 'food_beverage', 'fashion', 'service', 'other'] as const).map((type) => (
              <option key={type} value={type}>
                {t(`businessInfo.businessTypes.${type}`)}
              </option>
            ))}
          </select>
          {errors.businessType && <p className={errorCls}>{t('errors.businessTypeRequired')}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelCls}>
            {t('businessInfo.email')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            className={inputCls}
            placeholder={t('businessInfo.emailPlaceholder')}
            disabled={mutation.isPending}
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
          <label htmlFor="phone" className={labelCls}>
            {t('businessInfo.phone')}{' '}
            <span className="text-xs font-normal text-gray-400">({t('businessInfo.phoneHint')})</span>
          </label>
          <input
            {...register('phone')}
            id="phone"
            type="tel"
            className={inputCls}
            placeholder={t('businessInfo.phonePlaceholder')}
            disabled={mutation.isPending}
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? '...' : t('businessInfo.continue')}
        </button>
      </form>
    </Card>
  )
}

// ─── Step 2: Bank Account ─────────────────────────────────────────────────────

function StepBankAccount({
  token,
  onSuccess,
  onSkip,
}: {
  token: string
  onSuccess: () => void
  onSkip: () => void
}) {
  const t = useTranslations('onboarding')
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankAccountForm>({ resolver: zodResolver(bankAccountSchema) })

  const mutation = useMutation({
    mutationFn: async (data: BankAccountForm) => {
      const bank = INDONESIAN_BANKS.find((b) => b.code === data.bankCode)
      await apiClient.post(
        '/api/v1/tenants/settings/bank-accounts',
        {
          bankName: bank?.name ?? data.bankCode,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountHolderName: data.accountHolderName,
          isPrimary: true,
        },
        token,
      )
    },
    onSuccess,
    onError: () => setApiError(t('errors.bankAccountFailed')),
  })

  return (
    <Card title={t('bankAccount.title')} subtitle={t('bankAccount.subtitle')}>
      {apiError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{apiError}</div>
      )}
      <form onSubmit={handleSubmit((d) => { setApiError(null); mutation.mutate(d) })} className="space-y-4">
        {/* Bank */}
        <div>
          <label htmlFor="bankCode" className={labelCls}>
            {t('bankAccount.bank')} <span className="text-red-500">*</span>
          </label>
          <select
            {...register('bankCode')}
            id="bankCode"
            className={inputCls}
            disabled={mutation.isPending}
            defaultValue=""
          >
            <option value="" disabled>
              {t('bankAccount.selectBank')}
            </option>
            {INDONESIAN_BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          {errors.bankCode && <p className={errorCls}>{t('errors.bankRequired')}</p>}
        </div>

        {/* Account Number */}
        <div>
          <label htmlFor="accountNumber" className={labelCls}>
            {t('bankAccount.accountNumber')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('accountNumber')}
            id="accountNumber"
            className={inputCls}
            placeholder={t('bankAccount.accountNumberPlaceholder')}
            disabled={mutation.isPending}
          />
          {errors.accountNumber && <p className={errorCls}>{t('errors.accountNumberRequired')}</p>}
        </div>

        {/* Account Holder */}
        <div>
          <label htmlFor="accountHolderName" className={labelCls}>
            {t('bankAccount.accountHolderName')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('accountHolderName')}
            id="accountHolderName"
            className={inputCls}
            placeholder={t('bankAccount.accountHolderPlaceholder')}
            disabled={mutation.isPending}
          />
          {errors.accountHolderName && <p className={errorCls}>{t('errors.accountHolderRequired')}</p>}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? '...' : t('bankAccount.continue')}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={mutation.isPending}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            {t('bankAccount.skip')}
          </button>
        </div>
      </form>
    </Card>
  )
}

// ─── Step 3: Logo Upload ──────────────────────────────────────────────────────

function StepLogo({
  token,
  onSuccess,
  onSkip,
}: {
  token: string
  onSuccess: () => void
  onSkip: () => void
}) {
  const t = useTranslations('onboarding')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) return
      const fd = new FormData()
      fd.append('file', file)
      await apiClient.upload('/api/v1/tenants/settings/logo', fd, token)
    },
    onSuccess,
    onError: () => setApiError(t('errors.logoFailed')),
  })

  const handleFile = useCallback((f: File) => {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <Card title={t('logo.title')} subtitle={t('logo.subtitle')}>
      {apiError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{apiError}</div>
      )}

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-sky-400 hover:bg-sky-50"
      >
        {preview ? (
          <img
            src={preview}
            alt="Logo preview"
            className="mb-3 h-24 w-24 rounded-lg object-contain"
          />
        ) : (
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
            <svg className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <p className="text-sm font-medium text-gray-600">
          {preview ? t('logo.changeFile') : t('logo.dropzone')}
        </p>
        <p className="mt-1 text-xs text-gray-400">{t('logo.hint')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => { setApiError(null); mutation.mutate() }}
          disabled={!file || mutation.isPending}
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? t('logo.uploading') : t('logo.continue')}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={mutation.isPending}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          {t('logo.skip')}
        </button>
      </div>
    </Card>
  )
}

// ─── Step 4: Invoice Prefs ────────────────────────────────────────────────────

function StepInvoicePrefs({
  token,
  onSuccess,
  onSkip,
}: {
  token: string
  onSuccess: () => void
  onSkip: () => void
}) {
  const t = useTranslations('onboarding')
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoicePrefsForm>({
    resolver: zodResolver(invoicePrefsSchema),
    defaultValues: {
      invoicePrefix: 'INV',
      invoiceFormat: INVOICE_NUMBER_FORMATS[0].format,
      defaultPaymentTermsDays: 30,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: InvoicePrefsForm) => {
      await apiClient.patch(
        '/api/v1/tenants/settings',
        {
          invoicePrefix: data.invoicePrefix,
          invoiceFormat: data.invoiceFormat,
          defaultPaymentTermsDays: data.defaultPaymentTermsDays,
          defaultNotes: data.defaultNotes || null,
        },
        token,
      )
    },
    onSuccess,
    onError: () => setApiError(t('errors.invoicePrefsFailed')),
  })

  return (
    <Card title={t('invoicePrefs.title')} subtitle={t('invoicePrefs.subtitle')}>
      {apiError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{apiError}</div>
      )}
      <form onSubmit={handleSubmit((d) => { setApiError(null); mutation.mutate(d) })} className="space-y-4">
        {/* Invoice Prefix */}
        <div>
          <label htmlFor="invoicePrefix" className={labelCls}>
            {t('invoicePrefs.prefix')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('invoicePrefix')}
            id="invoicePrefix"
            className={inputCls}
            placeholder={t('invoicePrefs.prefixPlaceholder')}
            disabled={mutation.isPending}
          />
          {errors.invoicePrefix && <p className={errorCls}>{t('errors.prefixRequired')}</p>}
        </div>

        {/* Invoice Format */}
        <div>
          <label htmlFor="invoiceFormat" className={labelCls}>
            {t('invoicePrefs.format')}
          </label>
          <select
            {...register('invoiceFormat')}
            id="invoiceFormat"
            className={inputCls}
            disabled={mutation.isPending}
          >
            {INVOICE_NUMBER_FORMATS.map((fmt) => (
              <option key={fmt.id} value={fmt.format}>
                {fmt.label} — {fmt.format}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Terms */}
        <div>
          <label htmlFor="defaultPaymentTermsDays" className={labelCls}>
            {t('invoicePrefs.paymentTerms')}
          </label>
          <select
            {...register('defaultPaymentTermsDays')}
            id="defaultPaymentTermsDays"
            className={inputCls}
            disabled={mutation.isPending}
          >
            {PAYMENT_TERMS_OPTIONS.map((opt) => (
              <option key={opt.days} value={opt.days}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Default Notes */}
        <div>
          <label htmlFor="defaultNotes" className={labelCls}>
            {t('invoicePrefs.notes')}{' '}
            <span className="text-xs font-normal text-gray-400">
              ({t('invoicePrefs.notesHint')})
            </span>
          </label>
          <textarea
            {...register('defaultNotes')}
            id="defaultNotes"
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder={t('invoicePrefs.notesPlaceholder')}
            disabled={mutation.isPending}
          />
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? '...' : t('invoicePrefs.finish')}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={mutation.isPending}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            {t('invoicePrefs.skip')}
          </button>
        </div>
      </form>
    </Card>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [token, setToken] = useState<string>('')

  const stepLabels = STEPS.map((s) => t(`steps.${s}`))

  const advance = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      router.push('/dashboard')
    }
  }

  const handleBusinessInfoSuccess = (_tenantId: string, tok: string) => {
    setToken(tok)
    advance()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} labels={stepLabels} />

      {/* Step content */}
      {currentStep === 0 && <StepBusinessInfo onSuccess={handleBusinessInfoSuccess} />}
      {currentStep === 1 && (
        <StepBankAccount token={token} onSuccess={advance} onSkip={advance} />
      )}
      {currentStep === 2 && (
        <StepLogo token={token} onSuccess={advance} onSkip={advance} />
      )}
      {currentStep === 3 && (
        <StepInvoicePrefs token={token} onSuccess={() => router.push('/dashboard')} onSkip={() => router.push('/dashboard')} />
      )}
    </div>
  )
}
