'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/lib/navigation'
import { Link } from '@/lib/navigation'

type RegisterFormData = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

function getRegisterSchema(t: (key: string) => string) {
  return z
    .object({
      fullName: z.string().min(1, t('errors.fullNameRequired')).max(255),
      email: z.string().email(t('errors.invalidEmail')),
      password: z.string().min(8, t('errors.passwordTooShort')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('errors.passwordMismatch'),
      path: ['confirmPassword'],
    })
}

function mapSupabaseError(message: string, t: (key: string) => string): string {
  if (message.includes('already registered') || message.includes('User already registered')) {
    return t('errors.userAlreadyExists')
  }
  if (message.includes('rate limit')) {
    return t('errors.tooManyRequests')
  }
  return t('errors.unknown')
}

export function RegisterForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const schema = getRegisterSchema(t)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(mapSupabaseError(signUpError.message, t))
        return
      }

      setRegisteredEmail(data.email)
    } catch {
      setError(t('errors.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (oauthError) {
        setError(t('errors.unknown'))
        setIsGoogleLoading(false)
      }
    } catch {
      setError(t('errors.unknown'))
      setIsGoogleLoading(false)
    }
  }

  if (registeredEmail) {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">{t('checkEmailTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.7 }}>
          {t('checkEmailSubtitle', { email: registeredEmail })}
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:opacity-70"
            style={{ color: 'hsl(158 68% 28%)' }}
          >
            {t('login')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t('createAccount')}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: 'hsl(158 68% 28%)' }}
          >
            {t('login')}
          </Link>
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isGoogleLoading || isLoading}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {isGoogleLoading ? t('creatingAccount') : t('registerWithGoogle')}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-muted-foreground">atau</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
            {t('fullName')}
          </label>
          <input
            {...register('fullName')}
            id="fullName"
            type="text"
            autoComplete="name"
            className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            placeholder="Nama Lengkap Anda"
            disabled={isLoading}
          />
          {errors.fullName && (
            <p className="mt-1.5 text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            {t('password')}
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
          disabled={isLoading || isGoogleLoading}
          className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'hsl(158 68% 30%)' }}
        >
          {isLoading ? t('creatingAccount') : t('register')}
        </button>
      </form>
    </div>
  )
}
