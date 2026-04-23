'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api-client'
import { INDONESIAN_BANKS } from '@invoicein/shared/constants'
import type { BankAccount } from '@/lib/types'

const inputCls =
  'mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted'
const labelCls = 'block text-sm font-medium text-foreground'
const errorCls = 'mt-1 text-xs text-red-600'

const addSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().min(1),
  accountHolderName: z.string().min(1),
})

type AddForm = z.infer<typeof addSchema>

interface Props {
  bankAccounts: BankAccount[]
  token: string
  onChanged: () => void
}

export function TabBankAccounts({ bankAccounts, token, onChanged }: Props) {
  const t = useTranslations('settings')
  const [showForm, setShowForm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddForm>({ resolver: zodResolver(addSchema) })

  const addMutation = useMutation({
    mutationFn: (data: AddForm) => {
      const bank = INDONESIAN_BANKS.find((b) => b.code === data.bankCode)
      return apiClient.post(
        '/api/v1/tenants/settings/bank-accounts',
        {
          bankName: bank?.name ?? data.bankCode,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountHolderName: data.accountHolderName,
          isPrimary: bankAccounts.length === 0,
        },
        token,
      )
    },
    onSuccess: () => {
      reset()
      setShowForm(false)
      onChanged()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/tenants/settings/bank-accounts/${id}`, token),
    onSuccess: () => {
      setDeleteError(null)
      onChanged()
    },
    onError: () => setDeleteError(t('errors.deleteFailed')),
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('bankAccounts.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('bankAccounts.subtitle')}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent"
          >
            + {t('bankAccounts.addAccount')}
          </button>
        )}
      </div>

      {deleteError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{deleteError}</div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-secondary p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t('bankAccounts.addAccount')}</h3>
          <form
            onSubmit={handleSubmit((d) => addMutation.mutate(d))}
            className="space-y-4"
          >
            <div>
              <label className={labelCls}>
                {t('bankAccounts.bank')} <span className="text-red-500">*</span>
              </label>
              <select
                {...register('bankCode')}
                className={inputCls}
                defaultValue=""
                disabled={addMutation.isPending}
              >
                <option value="" disabled>
                  {t('bankAccounts.selectBank')}
                </option>
                {INDONESIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.bankCode && <p className={errorCls}>{t('errors.bankRequired')}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  {t('bankAccounts.accountNumber')} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('accountNumber')}
                  className={inputCls}
                  placeholder={t('bankAccounts.accountNumberPlaceholder')}
                  disabled={addMutation.isPending}
                />
                {errors.accountNumber && (
                  <p className={errorCls}>{t('errors.accountNumberRequired')}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>
                  {t('bankAccounts.accountHolderName')} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('accountHolderName')}
                  className={inputCls}
                  placeholder={t('bankAccounts.accountHolderPlaceholder')}
                  disabled={addMutation.isPending}
                />
                {errors.accountHolderName && (
                  <p className={errorCls}>{t('errors.accountHolderRequired')}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
              >
                {addMutation.isPending ? t('bankAccounts.saving') : t('bankAccounts.save')}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setShowForm(false) }}
                disabled={addMutation.isPending}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                {t('bankAccounts.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account list */}
      {bankAccounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t('bankAccounts.noAccounts')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('bankAccounts.noAccountsHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {bankAccounts.map((acc) => (
            <li
              key={acc.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{acc.bankName}</span>
                  {acc.isPrimary && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
                      {t('bankAccounts.primary')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {acc.accountNumber} · {acc.accountHolderName}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(acc.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                {t('bankAccounts.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
