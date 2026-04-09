import { useTranslations } from 'next-intl'

export default function RegisterPage() {
  const t = useTranslations('auth')
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h1 className="text-2xl font-bold text-gray-900">{t('createAccount')}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t('hasAccount')}{' '}
        <a href="../login" className="font-medium text-sky-600 hover:underline">
          {t('login')}
        </a>
      </p>
      {/* Form implemented in E2-005 */}
      <div className="mt-6 rounded-lg bg-sky-50 p-4 text-sm text-sky-700">
        Registration form — implemented in E2-005 (Auth UI)
      </div>
    </div>
  )
}
