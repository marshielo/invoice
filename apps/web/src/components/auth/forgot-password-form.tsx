'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/lib/navigation'

type ForgotPasswordFormData = { email: string }

export function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(
      z.object({ email: z.string().email(t('errors.invalidEmail')) }),
    ),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (resetError) {
        if (resetError.message.includes('rate limit')) {
          setError(t('errors.tooManyRequests'))
        } else {
          setError(t('errors.unknown'))
        }
        return
      }

      setSent(true)
    } catch {
      setError(t('errors.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm text-center">
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'hsl(152 26% 90%)' }}
        >
          <svg
            className="h-6 w-6"
            style={{ color: 'hsl(152 26% 36%)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">{t('resetLinkSent')}</h2>
        <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.7 }}>
          {t('checkEmailSubtitle', { email: getValues('email') })}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold transition-colors hover:opacity-70"
          style={{ color: 'hsl(158 68% 28%)' }}
        >
          {t('backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t('forgotPasswordTitle')}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground" style={{ lineHeight: 1.7 }}>
          {t('forgotPasswordSubtitle')}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {t('email')}
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            placeholder="nama@bisnis.com"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'hsl(158 68% 30%)' }}
        >
          {isLoading ? t('sendingEmail') : t('sendResetLink')}
        </button>

        <Link
          href="/login"
          className="block text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('backToLogin')}
        </Link>
      </form>
    </div>
  )
}
