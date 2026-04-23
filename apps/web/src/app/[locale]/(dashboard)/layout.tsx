'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { LayoutDashboard, FileText, Users, Package, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-card lg:flex">
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
          <Link href="/dashboard">
            <span className="font-display text-lg font-bold text-foreground" style={{ letterSpacing: '-0.01em' }}>
              Invoice<span style={{ color: 'hsl(158 68% 30%)' }}>in</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

function SidebarNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const items = [
    { href: '/dashboard',  label: t('dashboard'), Icon: LayoutDashboard },
    { href: '/invoices',   label: t('invoices'),  Icon: FileText },
    { href: '/clients',    label: t('clients'),   Icon: Users },
    { href: '/products',   label: t('products'),  Icon: Package },
    { href: '/settings',   label: t('settings'),  Icon: Settings },
  ] as const

  function isActive(href: string) {
    // Exact match for /dashboard to avoid it matching everything
    if (href === '/dashboard') return pathname === href || pathname.endsWith('/dashboard')
    return pathname.includes(href)
  }

  return (
    <div className="flex flex-1 flex-col justify-between">
      <nav className="space-y-0.5 px-2 py-3">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold bg-secondary text-foreground transition-colors'
                  : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-border px-2 py-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </div>
  )
}
