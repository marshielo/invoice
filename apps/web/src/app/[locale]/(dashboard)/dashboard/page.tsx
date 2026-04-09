import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('totalRevenue')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        Dashboard — implemented in E11 (Dashboard & Reports epic)
      </p>
    </div>
  )
}
