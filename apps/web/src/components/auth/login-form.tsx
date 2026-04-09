'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import { useRouter } from '@/lib/navigation'
import { Link } from '@/lib/navigation'

type LoginFormData = {
  email: string
  password: string
}

function getLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t('errors.invalidEmail')),
    password: z.string().min(8, t('errors.passwordTooShort')),
  })
}

function mapSupabaseError(code: string | undefined, t: (key: string) => string): string {
  switch (code) {
    case 'invalid_credentials':
      return t('errors.invalidCredentials')
    case 'email_not_confirmed':
      return t('errors.emailNotConfirmed')
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t('errors.tooManyRequests')
    default:
      return t('errors.unknown')
  }
}

export function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const schema = getLoginSchema(t)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(mapSupabaseError(authError.code, t))
        return
      }

      // Determine redirect based on tenant presence
      const token = authData.session?.access_token
      if (!token) {
        setError(t('errors.unknown'))
        return
      }

      try {
        const me = await apiClient.get<{ success: true; data: { hasTenant: boolean } }>('/api/v1/auth/me', token)
        if (me.data.hasTenant) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      } catch {
        // If /auth/me fails, default to dashboard (tenant middleware will catch it)
        router.push('/dashboard')
      }
    } catch {
      setError(t('errors.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
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
        setError(mapSupabaseError(oauthError.code, t))
        setIsGoogleLoading(false)
      }
      // Otherwise, user is redirected to Google — no further action needed here
    } catch {
      setError(t('errors.unknown'))
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('welcomeBack')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link href="/register" className="font-medium text-sky-600 hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {isGoogleLoading ? t('signingIn') : t('loginWithGoogle')}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400">atau</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {t('email')}
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50"
            placeholder="nama@bisnis.com"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('password')}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t('signingIn') : t('login')}
        </button>
      </form>
    </div>
  )
}
