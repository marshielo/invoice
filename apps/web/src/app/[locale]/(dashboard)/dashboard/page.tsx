import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ringkasan performa bisnis Anda akan tersedia di sini.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Invoice', value: '—' },
          { label: 'Belum Dibayar', value: '—' },
          { label: 'Total Pendapatan', value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
