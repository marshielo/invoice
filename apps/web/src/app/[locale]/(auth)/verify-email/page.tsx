import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth')
  return { title: `${t('checkEmailTitle')} — Invoicein` }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}): Promise<React.ReactNode> {
  const t = await getTranslations('auth')
  const { email } = await searchParams

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
        <svg
          className="h-6 w-6 text-sky-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900">{t('checkEmailTitle')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {email
          ? t('checkEmailSubtitle', { email })
          : t('checkEmailSubtitle', { email: 'email Anda' })}
      </p>
      <p className="mt-6 text-xs text-gray-400">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-medium text-sky-600 hover:underline">
          {t('login')}
        </Link>
      </p>
    </div>
  )
}
