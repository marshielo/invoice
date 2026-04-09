import { useTranslations } from 'next-intl'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — full implementation in E2-006 */}
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-bold text-sky-600">Invoicein</span>
        </div>
        <SidebarNav />
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

function SidebarNav() {
  const t = useTranslations('nav')
  const items = [
    { href: 'dashboard', label: t('dashboard'), icon: '🏠' },
    { href: 'invoices', label: t('invoices'), icon: '📄' },
    { href: 'clients', label: t('clients'), icon: '👥' },
    { href: 'products', label: t('products'), icon: '📦' },
    { href: 'settings', label: t('settings'), icon: '⚙️' },
  ] as const

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  )
}
