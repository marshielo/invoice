'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api-client'
import { useToken } from '@/hooks/use-token'
import type { ApiResponse, SettingsData } from '@/lib/types'
import { TabBusinessProfile } from './tab-business-profile'
import { TabBankAccounts } from './tab-bank-accounts'
import { TabQris } from './tab-qris'
import { TabInvoiceSettings } from './tab-invoice-settings'
import { TabTeam } from './tab-team'

type Tab = 'businessProfile' | 'bankAccounts' | 'qris' | 'invoiceSettings' | 'team'
const TABS: Tab[] = ['businessProfile', 'bankAccounts', 'qris', 'invoiceSettings', 'team']

export function SettingsPage() {
  const t = useTranslations('settings')
  const token = useToken()
  const [activeTab, setActiveTab] = useState<Tab>('businessProfile')

  const {
    data: settings,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['settings', token],
    queryFn: () =>
      apiClient
        .get<ApiResponse<SettingsData>>('/api/v1/tenants/settings', token!)
        .then((r) => r.data),
    enabled: !!token,
    staleTime: 30_000,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      {/* Tab nav */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {isLoading || !token ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Loading...
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {t('errors.loadFailed')}
            <button
              onClick={() => refetch()}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        ) : settings ? (
          <>
            {activeTab === 'businessProfile' && (
              <TabBusinessProfile settings={settings} token={token!} onSaved={() => refetch()} />
            )}
            {activeTab === 'bankAccounts' && (
              <TabBankAccounts
                bankAccounts={settings.bankAccounts}
                token={token!}
                onChanged={() => refetch()}
              />
            )}
            {activeTab === 'qris' && (
              <TabQris qris={settings.qris} token={token!} onChanged={() => refetch()} />
            )}
            {activeTab === 'invoiceSettings' && (
              <TabInvoiceSettings settings={settings} token={token!} onSaved={() => refetch()} />
            )}
            {activeTab === 'team' && (
              <TabTeam plan={settings.subscriptionPlan} token={token!} />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
