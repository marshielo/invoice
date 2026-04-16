import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import {
  ArrowRight,
  Check,
  FileText,
  BarChart3,
  Users,
  Shield,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   ABSTRACT GEOMETRIC MOTIF — "Thought in Motion"
   Three circles of different scales, connected by a flowing curve,
   with an orbital ellipse suggesting the path of connection.
   Bauhaus construction. Philosophical intention.
   ═══════════════════════════════════════════════════════════════════════════ */
function ThoughtMotif({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 360 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      {/* ── Background flow lines — perspective/depth ── */}
      <line x1="0"   y1="310" x2="360" y2="288" stroke="currentColor" strokeWidth="0.5" opacity="0.10" />
      <line x1="0"   y1="334" x2="360" y2="312" stroke="currentColor" strokeWidth="0.5" opacity="0.07" />
      <line x1="0"   y1="356" x2="360" y2="334" stroke="currentColor" strokeWidth="0.5" opacity="0.04" />

      {/* ── Outer orbital ellipse — the field of thought ── */}
      <ellipse
        cx="168" cy="188"
        rx="162" ry="122"
        transform="rotate(-8 168 188)"
        stroke="currentColor" strokeWidth="0.7" opacity="0.18"
        className="motif-outer-ellipse"
      />

      {/* ── Primary circle — the central idea ── */}
      <circle
        cx="142" cy="192"
        r="88"
        stroke="currentColor" strokeWidth="1.8" opacity="0.82"
        className="motif-primary-circle"
      />

      {/* ── Inner orbital ellipse — the working thought within ── */}
      <ellipse
        cx="142" cy="192"
        rx="51" ry="33"
        transform="rotate(-24 142 192)"
        stroke="currentColor" strokeWidth="0.9" opacity="0.48"
      />

      {/* ── Secondary circle — satellite thought, upper right ── */}
      <circle
        cx="278" cy="88"
        r="50"
        stroke="currentColor" strokeWidth="1.4" opacity="0.62"
        className="motif-secondary-circle"
      />

      {/* ── Tertiary circle — distant emerging idea ── */}
      <circle
        cx="302" cy="268"
        r="25"
        stroke="currentColor" strokeWidth="1.1" opacity="0.42"
      />

      {/* ── Connecting flow path — threads all three ── */}
      <path
        d="M 278 88
           C 258 110, 214 126, 190 154
           C 164 182, 128 202, 142 238
           C 155 265, 276 258, 302 268"
        stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" opacity="0.68"
      />

      {/* ── Counter-arc — a separate thought begins ── */}
      <path
        d="M 52 112 C 70 128, 78 116, 80 142"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.36"
      />

      {/* ── Node dots — anchors at key intersection points ── */}
      <circle cx="278" cy="88"  r="5.5" fill="currentColor" opacity="0.88" />
      <circle cx="142" cy="192" r="4.5" fill="currentColor" opacity="0.72" />
      <circle cx="302" cy="268" r="3.0" fill="currentColor" opacity="0.52" />
      <circle cx="80"  cy="142" r="2.5" fill="currentColor" opacity="0.32" />
    </svg>
  )
}

/* Smaller version for section accents */
function SmallMotif({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      <circle cx="48" cy="65" r="30" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      <circle cx="92" cy="32" r="18" stroke="currentColor" strokeWidth="1.0" opacity="0.5" />
      <ellipse cx="48" cy="65" rx="17" ry="11" transform="rotate(-22 48 65)" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
      <path d="M 92 32 C 84 44, 68 52, 60 62 C 50 73, 45 85, 48 96" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <circle cx="92" cy="32" r="3.5" fill="currentColor" opacity="0.8" />
      <circle cx="48" cy="65" r="2.8" fill="currentColor" opacity="0.65" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT MOCKUP
   ═══════════════════════════════════════════════════════════════════════════ */
function DashboardMockup() {
  const rows = [
    { name: 'Sari Dewi',    inv: 'INV-001', amount: 'Rp 8.500.000',  status: 'Lunas',  sBg: '#d1fae5', sColor: '#065f46' },
    { name: 'Budi Santoso', inv: 'INV-002', amount: 'Rp 3.200.000',  status: 'Proses', sBg: '#fef3c7', sColor: '#92400e' },
    { name: 'Ahmad Fauzi',  inv: 'INV-003', amount: 'Rp 12.800.000', status: 'Lewat',  sBg: '#fee2e2', sColor: '#991b1b' },
  ]
  return (
    <div className="relative select-none">
      <div
        className="overflow-hidden rounded-2xl"
        style={{ boxShadow: '0 28px 72px -6px rgba(29,24,18,0.16), 0 0 0 1px rgba(29,24,18,0.07)' }}
      >
        {/* Browser bar */}
        <div className="flex items-center gap-2 bg-gray-100 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex h-5 flex-1 items-center rounded bg-white px-2 mx-2">
            <span className="text-[10px] text-gray-400">app.invoicein.id/tagihan</span>
          </div>
        </div>

        {/* App */}
        <div className="flex bg-white" style={{ height: 340 }}>
          {/* Sidebar */}
          <div
            className="flex w-12 flex-col items-center gap-3 py-4"
            style={{ background: 'hsl(152 26% 18%)' }}
          >
            <div
              className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-bold text-white"
              style={{ background: 'hsl(152 26% 36%)' }}
            >
              IN
            </div>
            {[FileText, Users, BarChart3, Shield].map((Icon, i) => (
              <div
                key={i}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: i === 0 ? 'hsl(152 26% 36% / 0.35)' : 'transparent' }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: i === 0 ? '#fff' : 'hsl(152 26% 60%)' }} />
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex flex-1 flex-col bg-gray-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Tagihan</span>
              <div
                className="rounded-lg px-3 py-1 text-[10px] font-semibold text-white"
                style={{ background: 'hsl(158 68% 30%)' }}
              >
                + Buat Baru
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[9px] uppercase tracking-wide text-gray-400">Bulan Ini</p>
                <p className="mt-0.5 text-base font-bold text-gray-800">Rp 24,5M</p>
                <p className="mt-0.5 text-[9px]" style={{ color: 'hsl(152 26% 36%)' }}>↑ 12% vs bulan lalu</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[9px] uppercase tracking-wide text-gray-400">Menunggu</p>
                <p className="mt-0.5 text-base font-bold text-gray-800">3 tagihan</p>
                <p className="mt-0.5 text-[9px] text-yellow-600">Rp 16,0M total</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Terbaru</span>
              </div>
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'hsl(158 68% 30%)' }}
                  >
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">{r.name}</p>
                    <p className="text-[9px] text-gray-400">{r.inv}</p>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-700 shrink-0">{r.amount}</p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: r.sBg, color: r.sColor }}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating: payment confirmed */}
      <div
        className="absolute -bottom-5 -left-5 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3"
        style={{ boxShadow: '0 8px 28px rgba(29,24,18,0.13)' }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'hsl(152 26% 92%)' }}>
          <Check className="h-4 w-4" style={{ color: 'hsl(152 26% 36%)' }} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-800">Pembayaran Diterima</p>
          <p className="text-[10px] text-gray-400">Rp 8.500.000 dari Sari Dewi</p>
        </div>
      </div>
    </div>
  )
}

function ChatMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 24px 64px rgba(29,24,18,0.12), 0 0 0 1px rgba(29,24,18,0.07)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'hsl(152 26% 16%)' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'hsl(152 26% 36%)' }}>
          IN
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Invoicein AI</p>
          <p className="text-[10px]" style={{ color: 'hsl(152 26% 65%)' }}>Siap membantu kapan saja</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex justify-end">
          <div className="max-w-[76%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white" style={{ background: 'hsl(158 68% 30%)' }}>
            Buat tagihan untuk Sari Dewi, jasa desain logo Rp 2.500.000, jatuh tempo 30 April
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: 'hsl(152 26% 36%)' }}>
            AI
          </div>
          <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm text-foreground">
            Tagihan <span className="font-semibold">INV-004</span> sudah dibuat! 🎉
            <div className="mt-3 rounded-xl p-3" style={{ background: 'hsl(38 20% 92%)' }}>
              <p className="text-[11px] font-semibold text-foreground">INV-004 · Sari Dewi</p>
              <p className="text-lg font-bold" style={{ color: 'hsl(158 68% 26%)' }}>Rp 2.500.000</p>
              <p className="text-[10px] text-muted-foreground">Jatuh tempo 30 April 2025</p>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-lg py-2 text-center text-[11px] font-semibold text-white" style={{ background: 'hsl(158 68% 30%)' }}>
                Kirim WhatsApp
              </div>
              <div className="flex-1 rounded-lg border border-border py-2 text-center text-[11px] font-semibold text-foreground">
                Unduh PDF
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WhatsAppMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 24px 64px rgba(29,24,18,0.12), 0 0 0 1px rgba(29,24,18,0.07)' }}
    >
      <div className="flex items-center gap-3 bg-[#075E54] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-400 text-sm font-bold text-white">SD</div>
        <div>
          <p className="text-sm font-semibold text-white">Sari Dewi</p>
          <p className="text-[10px] text-green-200">WhatsApp</p>
        </div>
      </div>
      <div className="p-4 space-y-3" style={{ background: '#efeae2', minHeight: 240 }}>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3.5 shadow-sm text-sm text-gray-800">
            <p className="font-semibold text-gray-500 text-xs mb-2">Invoicein Business</p>
            <p>Halo Sari! 👋 Kamu punya tagihan baru:</p>
            <div className="mt-3 rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] text-gray-400">INV-004 · Jasa Desain Logo</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'hsl(158 68% 24%)' }}>Rp 2.500.000</p>
              <p className="text-xs text-gray-400 mt-0.5">Jatuh tempo 30 April 2025</p>
            </div>
            <div className="mt-3 rounded-xl py-2.5 text-center text-sm font-semibold text-white" style={{ background: 'hsl(152 26% 36%)' }}>
              Bayar Sekarang →
            </div>
            <p className="mt-1.5 text-[9px] text-gray-400 text-right">10:32 ✓✓</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[65%] rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-sm" style={{ background: '#dcf8c6', color: '#111' }}>
            Oke siap, langsung saya bayar 👍
            <p className="mt-1 text-[9px] text-gray-400 text-right">10:34 ✓✓</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const t = useTranslations('landing')

  return (
    <div className="min-h-screen bg-background">

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo — Fraunces serif */}
          <span className="font-display text-xl font-bold text-foreground" style={{ letterSpacing: '-0.01em' }}>
            Invoice<span style={{ color: 'hsl(158 68% 30%)' }}>in</span>
          </span>

          <div className="hidden items-center gap-8 md:flex">
            {['#fitur', '#cara-kerja', '#harga'].map((href, i) => (
              <a key={href} href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground" style={{ letterSpacing: '0.01em' }}>
                {['Fitur', 'Cara Kerja', 'Harga'][i]}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-88"
              style={{ background: 'hsl(158 68% 30%)' }}
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background py-24 lg:py-32">
        {/* Very subtle warm background wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 65% 50%, hsl(38 28% 94% / 0.8) 0%, transparent 70%)' }}
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_1fr]">

            {/* ── Left: editorial text ── */}
            <div style={{ animation: 'editorial-reveal 0.9s ease-out both' }}>

              {/* Overline — small caps, no badge shape */}
              <p
                className="overline-text text-muted-foreground"
                style={{ letterSpacing: '0.14em' }}
              >
                Untuk UMKM Indonesia
              </p>

              {/* Headline — Fraunces serif, editorial scale */}
              <h1
                className="font-display mt-5 text-[3.25rem] font-bold text-foreground lg:text-[4rem]"
                style={{ lineHeight: 1.1, letterSpacing: '-0.02em' }}
              >
                {t('hero.title')
                  .split('\n')
                  .map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {i === 1 ? (
                        <em style={{ color: 'hsl(158 68% 30%)', fontStyle: 'italic' }}>{line}</em>
                      ) : (
                        line
                      )}
                    </span>
                  ))}
              </h1>

              {/* Body — generous line-height */}
              <p
                className="mt-8 max-w-lg text-[1.0625rem] text-muted-foreground"
                style={{ lineHeight: 1.78, letterSpacing: '0.01em' }}
              >
                {t('hero.subtitle')}
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{
                    background: 'hsl(158 68% 30%)',
                    boxShadow: '0 4px 18px hsl(158 68% 30% / 0.28)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {t('hero.cta')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#cara-kerja"
                  className="inline-flex items-center gap-1.5 text-sm text-foreground transition-opacity hover:opacity-60"
                  style={{ letterSpacing: '0.01em' }}
                >
                  {t('hero.ctaSecondary')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Trust note — quiet, considered */}
              <p
                className="mt-5 text-xs text-muted-foreground"
                style={{ letterSpacing: '0.02em' }}
              >
                {t('hero.noCC')}
              </p>
            </div>

            {/* ── Right: abstract motif + product ── */}
            <div
              className="relative flex justify-center lg:justify-end"
              style={{ animation: 'editorial-reveal 0.9s ease-out both 200ms' }}
            >
              {/* Abstract motif — large, behind product */}
              <div className="absolute inset-0 flex items-center justify-center">
                <ThoughtMotif
                  className="motif-svg-wrap h-[420px] w-[420px] opacity-30"
                  style={{ color: 'hsl(158 68% 30%)' }}
                />
              </div>

              {/* Product mockup — on top */}
              <div className="relative z-10 w-full max-w-lg">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Numerical callouts — editorial stat strip ─────────────── */}
      <section className="border-y border-border py-12" style={{ background: 'hsl(38 16% 95%)' }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            {[
              { n: '10 detik', label: 'Rata-rata waktu buat tagihan dengan AI' },
              { n: '5×',       label: 'Lebih tinggi open rate WhatsApp vs. email' },
              { n: 'Rp 0',     label: 'Untuk memulai, selamanya' },
            ].map(({ n, label }) => (
              <div key={n} className="px-6">
                <p
                  className="font-display text-4xl font-bold text-foreground"
                  style={{ letterSpacing: '-0.02em', color: 'hsl(158 68% 30%)' }}
                >
                  {n}
                </p>
                <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features — editorial grid ─────────────────────────────── */}
      <section id="fitur" className="py-28">
        <div className="mx-auto max-w-6xl px-6">

          {/* Section header */}
          <div className="mx-auto max-w-2xl">
            <p className="overline-text" style={{ color: 'hsl(158 68% 30%)', letterSpacing: '0.14em' }}>
              Fitur
            </p>
            <h2
              className="font-display mt-4 text-4xl font-bold text-foreground"
              style={{ lineHeight: 1.15, letterSpacing: '-0.015em' }}
            >
              <em style={{ fontStyle: 'italic' }}>{t('features.title')}</em>
            </h2>
            <p className="mt-5 text-[1.0625rem] text-muted-foreground" style={{ lineHeight: 1.78 }}>
              {t('features.subtitle')}
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'AI Chat-to-Invoice',
                body: 'Deskripsikan tagihan dalam bahasa natural. AI menyusun item, harga, dan tanggal jatuh tempo.',
                accent: 'hsl(158 68% 30%)',
              },
              {
                title: 'Kirim via WhatsApp',
                body: 'Satu klik langsung ke HP pelanggan. Lebih cepat dari email, lebih profesional dari foto.',
                accent: 'hsl(152 26% 36%)',
              },
              {
                title: 'Bayar di Tagihan',
                body: 'QRIS dan transfer bank tertanam langsung. Pelanggan bayar tanpa perlu tanya rekening.',
                accent: 'hsl(158 68% 30%)',
              },
              {
                title: 'Dokumen Profesional',
                body: 'Template tagihan bermerek: logo, nomor NPWP, catatan, dan tanda tangan digital.',
                accent: 'hsl(152 26% 36%)',
              },
              {
                title: 'Manajemen Klien',
                body: 'Simpan data klien, riwayat tagihan, dan catatan internal — terorganisir otomatis.',
                accent: 'hsl(158 68% 30%)',
              },
              {
                title: 'Laporan Real-time',
                body: 'Pantau pendapatan, tagihan menunggu, dan tren bisnis dari satu dashboard.',
                accent: 'hsl(152 26% 36%)',
              },
            ].map(({ title, body, accent }, i) => (
              <div
                key={title}
                className="group relative rounded-2xl border border-border bg-card p-7 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Tiny motif accent in corner */}
                <div className="absolute right-5 top-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <SmallMotif
                    className="h-10 w-10"
                    style={{ color: accent, opacity: 0.35 }}
                  />
                </div>

                {/* Number */}
                <p
                  className="font-display text-3xl font-bold"
                  style={{ color: accent, opacity: 0.25, letterSpacing: '-0.02em' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </p>

                <h3
                  className="font-display mt-4 text-lg font-semibold text-foreground"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {title}
                </h3>
                <p
                  className="mt-3 text-sm text-muted-foreground"
                  style={{ lineHeight: 1.75 }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature deep 1 — AI Chat (warm sand bg) ───────────────── */}
      <section
        id="cara-kerja"
        className="relative overflow-hidden py-28"
        style={{ background: 'hsl(38 20% 93%)' }}
      >
        {/* Diagonal hatch texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(-52deg, transparent, transparent 22px, hsl(158 68% 30% / 0.04) 22px, hsl(158 68% 30% / 0.04) 23px)',
          }}
        />

        {/* Faint large motif — background art */}
        <div className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.07]">
          <ThoughtMotif
            className="h-[520px] w-[520px]"
            style={{ color: 'hsl(158 68% 30%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Mockup */}
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="w-full max-w-md">
                <ChatMockup />
              </div>
            </div>
            {/* Text */}
            <div className="order-1 lg:order-2">
              <p className="overline-text" style={{ color: 'hsl(158 68% 30%)', letterSpacing: '0.14em' }}>
                AI Chat-to-Invoice
              </p>
              <h2
                className="font-display mt-4 text-4xl font-bold text-foreground"
                style={{ lineHeight: 1.15, letterSpacing: '-0.015em' }}
              >
                Buat tagihan secepat mengetik pesan
              </h2>
              <p className="mt-6 text-[1.0625rem] text-muted-foreground" style={{ lineHeight: 1.78 }}>
                Tidak perlu isi form satu per satu. Cukup ketik deskripsi dalam bahasa Indonesia — AI Invoicein menyusun tagihan yang siap kirim.
              </p>
              <ul className="mt-8 space-y-5">
                {[
                  'Mendukung bahasa Indonesia alami',
                  'Deteksi nama klien, item, harga, dan tanggal otomatis',
                  'Bisa diedit sebelum dikirim',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3.5 text-foreground">
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'hsl(158 68% 30%)' }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span style={{ lineHeight: 1.65 }}>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-10 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'hsl(158 68% 30%)' }}
              >
                Coba Sekarang Gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature deep 2 — WhatsApp (white bg) ──────────────────── */}
      <section className="relative overflow-hidden py-28 bg-card">
        {/* Faint large motif — background art, left side */}
        <div className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 opacity-[0.06]">
          <ThoughtMotif
            className="h-[500px] w-[500px]"
            style={{ color: 'hsl(152 26% 36%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Text */}
            <div>
              <p className="overline-text" style={{ color: 'hsl(152 26% 36%)', letterSpacing: '0.14em' }}>
                Pengiriman Tagihan
              </p>
              <h2
                className="font-display mt-4 text-4xl font-bold text-foreground"
                style={{ lineHeight: 1.15, letterSpacing: '-0.015em' }}
              >
                Tagihan langsung ke HP pelanggan
              </h2>
              <p className="mt-6 text-[1.0625rem] text-muted-foreground" style={{ lineHeight: 1.78 }}>
                Kirim tagihan profesional via WhatsApp dalam satu klik. Pelanggan menerima link lengkap dengan tombol bayar — langsung di chat mereka.
              </p>
              <ul className="mt-8 space-y-5">
                {[
                  'Open rate WhatsApp 5× lebih tinggi dari email',
                  'QRIS dan transfer bank tertanam di halaman tagihan',
                  'Pelanggan bayar tanpa install aplikasi apapun',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3.5 text-foreground">
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'hsl(152 26% 36%)' }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span style={{ lineHeight: 1.65 }}>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-10 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'hsl(152 26% 36%)' }}
              >
                Mulai Kirim Tagihan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm">
                <WhatsAppMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial — literary pull quote ─────────────────────── */}
      <section
        className="relative overflow-hidden py-24"
        style={{ background: 'hsl(22 22% 12%)' }}
      >
        {/* Grid motif on dark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '52px 52px',
          }}
        />
        {/* Radial vignette over grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 30%, hsl(22 22% 12%) 100%)' }}
        />

        {/* Faint motif top-right */}
        <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.08]">
          <ThoughtMotif
            className="h-80 w-80"
            style={{ color: 'hsl(38 28% 90%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          {/* Large Fraunces italic opening mark */}
          <p
            className="font-display text-[7rem] font-bold leading-none text-white/10"
            style={{ marginBottom: '-1.5rem' }}
            aria-hidden
          >
            "
          </p>

          {/* Pull quote — Fraunces italic, generous */}
          <blockquote>
            <p
              className="font-display text-2xl font-semibold italic text-white/90 sm:text-3xl"
              style={{ lineHeight: 1.45, letterSpacing: '-0.01em' }}
            >
              Dulu saya kirim foto tagihan tulis tangan. Sekarang pakai Invoicein, klien langsung bayar lewat QRIS. Profesional banget!
            </p>
            <footer className="mt-10 flex items-center justify-center gap-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'hsl(158 68% 30%)' }}
              >
                RW
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Rina Wulandari</p>
                <p className="overline-text mt-0.5" style={{ color: 'hsl(38 20% 55%)', letterSpacing: '0.1em' }}>
                  Pemilik Toko Kue Artisan, Jakarta
                </p>
              </div>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="harga" className="py-28 bg-background">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-xl">
            <p className="overline-text" style={{ color: 'hsl(158 68% 30%)', letterSpacing: '0.14em' }}>
              Harga
            </p>
            <h2
              className="font-display mt-4 text-4xl font-bold text-foreground"
              style={{ lineHeight: 1.15, letterSpacing: '-0.015em' }}
            >
              {t('pricing.title')}
            </h2>
            <p className="mt-4 text-[1.0625rem] text-muted-foreground" style={{ lineHeight: 1.78 }}>
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">

            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>
                  Gratis
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Untuk memulai</p>
                <p className="font-display mt-5 text-4xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
                  Rp 0
                </p>
              </div>
              <ul className="mt-8 flex-1 space-y-4">
                {['10 tagihan/bulan', 'Kirim via email', 'Laporan dasar', 'Dukungan komunitas'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'hsl(158 68% 30%)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 block rounded-xl border-2 border-border py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Professional — dark, featured */}
            <div
              className="relative flex flex-col overflow-hidden rounded-2xl p-8 text-white"
              style={{
                background: 'hsl(22 22% 14%)',
                boxShadow: '0 20px 56px hsl(22 22% 8% / 0.3)',
              }}
            >
              {/* Micro diagonal hatch inside card */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(-52deg, transparent, transparent 18px, rgba(255,255,255,0.025) 18px, rgba(255,255,255,0.025) 19px)',
                }}
              />
              {/* Faint small motif */}
              <div className="pointer-events-none absolute right-0 top-0 opacity-[0.06]">
                <SmallMotif className="h-28 w-28" style={{ color: 'hsl(38 28% 90%)' }} />
              </div>

              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold"
                style={{ background: 'hsl(158 68% 30%)', color: '#fff' }}
              >
                Terpopuler
              </div>

              <div className="relative">
                <h3 className="font-display text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>
                  Profesional
                </h3>
                <p className="mt-1 text-sm text-white/55">Untuk bisnis aktif</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>Rp 99.000</span>
                  <span className="text-sm text-white/55">/bln</span>
                </div>
              </div>
              <ul className="relative mt-8 flex-1 space-y-4">
                {['Tagihan tak terbatas', 'Kirim via WhatsApp', 'AI Chat-to-Invoice', 'Laporan lengkap', 'Prioritas dukungan'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white/85">
                    <Check className="h-4 w-4 shrink-0 text-white/80" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="relative mt-8 block rounded-xl py-3 text-center text-sm font-semibold text-white/10 transition-all hover:opacity-90"
                style={{ background: 'hsl(158 68% 30%)', color: '#fff' }}
              >
                Coba 14 Hari Gratis
              </Link>
            </div>

            {/* Business */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>
                  Bisnis
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Untuk tim & enterprise</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>Rp 249.000</span>
                  <span className="text-sm text-muted-foreground">/bln</span>
                </div>
              </div>
              <ul className="mt-8 flex-1 space-y-4">
                {['Semua fitur Profesional', 'Akses API', 'Multi-pengguna', 'Custom domain', 'Dedicated support'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'hsl(152 26% 36%)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:hello@invoicein.app"
                className="mt-8 block rounded-xl border-2 border-border py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Hubungi Kami
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner — warm, considered ─────────────────────────── */}
      <section
        className="relative overflow-hidden py-28"
        style={{ background: 'hsl(158 68% 26%)' }}
      >
        {/* Square grid motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '52px 52px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 30%, hsl(158 68% 26%) 100%)' }}
        />
        {/* Floating motif */}
        <div className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 opacity-[0.09]">
          <ThoughtMotif
            className="h-96 w-96"
            style={{ color: 'hsl(38 28% 96%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2
            className="font-display text-4xl font-bold text-white sm:text-5xl"
            style={{ lineHeight: 1.12, letterSpacing: '-0.02em' }}
          >
            Kamu tidak memulai bisnis<br />
            <em style={{ fontStyle: 'italic', color: 'hsl(38 40% 88%)' }}>untuk khawatir soal tagihan.</em>
          </h2>
          <p
            className="mt-7 text-lg"
            style={{ lineHeight: 1.75, color: 'hsl(158 30% 82%)' }}
          >
            Biarkan Invoicein urus tagihan, pembayaran, dan pengingat. Kamu fokus yang lebih penting.
          </p>
          <Link
            href="/register"
            className="mt-12 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold transition-all hover:bg-white/92 active:scale-[0.98]"
            style={{ color: 'hsl(158 68% 20%)', letterSpacing: '0.01em' }}
          >
            Daftar Gratis Sekarang
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p
            className="mt-5 text-sm"
            style={{ color: 'hsl(158 30% 68%)', letterSpacing: '0.02em' }}
          >
            Tidak perlu kartu kredit · Mulai dalam 2 menit
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        className="py-14"
        style={{ background: 'hsl(22 22% 10%)' }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <span
              className="font-display text-xl font-bold text-white/90"
              style={{ letterSpacing: '-0.01em' }}
            >
              Invoice<span style={{ color: 'hsl(158 68% 46%)' }}>in</span>
            </span>
            <p className="text-sm text-white/35" style={{ letterSpacing: '0.01em' }}>
              © 2025 Invoicein · Dibuat untuk UMKM Indonesia
            </p>
            <div className="flex gap-8">
              {['Privasi', 'Syarat', 'Kontak'].map((l) => (
                <a key={l} href="#" className="text-sm text-white/35 transition-colors hover:text-white/60" style={{ letterSpacing: '0.01em' }}>
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
