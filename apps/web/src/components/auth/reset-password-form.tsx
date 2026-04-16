'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/lib/navigation'

type ResetPasswordFormData = { password: string; confirmPassword: string }

export function ResetPasswordForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const schema = z
    .object({
      password: z.string().min(8, t('errors.passwordTooShort')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('errors.passwordMismatch'),
      path: ['confirmPassword'],
    })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        setError(t('errors.unknown'))
        return
      }

      router.push('/dashboard')
    } catch {
      setError(t('errors.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t('resetPasswordTitle')}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground" style={{ lineHeight: 1.7 }}>
          {t('resetPasswordSubtitle')}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            {t('newPassword')}
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="new-password"
            className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
            {t('confirmPassword')}
          </label>
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'hsl(158 68% 30%)' }}
        >
          {isLoading ? t('resettingPassword') : t('updatePassword')}
        </button>
      </form>
    </div>
  )
}
