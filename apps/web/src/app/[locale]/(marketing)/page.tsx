import { useTranslations } from 'next-intl'

export default function LandingPage() {
  const t = useTranslations('landing')

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 ring-1 ring-sky-700/10">
            ✨ {t('hero.badge')}
          </span>
          <h1 className="mt-4 whitespace-pre-line text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">{t('hero.subtitle')}</p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="/register"
              className="rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {t('hero.cta')}
            </a>
            <a href="#features" className="text-sm font-semibold leading-6 text-gray-900">
              {t('hero.ctaSecondary')} →
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">{t('hero.noCC')}</p>
        </div>
      </section>

      {/* Features placeholder */}
      <section id="features" className="bg-gray-50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">{t('features.title')}</h2>
          <p className="mt-4 text-gray-600">{t('features.subtitle')}</p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: '💬', title: 'Chat-to-Invoice AI', desc: 'Ketik deskripsi, AI buat tagihannya' },
              { icon: '📱', title: 'Kirim via WhatsApp', desc: 'Langsung ke HP pelanggan, 1 klik' },
              { icon: '⚡', title: 'Bayar di tempat', desc: 'QRIS & transfer bank langsung di tagihan' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="mb-3 text-4xl">{f.icon}</div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing placeholder */}
      <section id="pricing" className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">{t('pricing.title')}</h2>
          <p className="mt-4 text-gray-600">{t('pricing.subtitle')}</p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { name: 'Gratis', price: 'Rp 0', desc: '10 tagihan/bulan', highlight: false },
              { name: 'Profesional', price: 'Rp 99.000/bln', desc: 'Unlimited + WA + AI', highlight: true },
              { name: 'Bisnis', price: 'Rp 249.000/bln', desc: 'Semua fitur + API', highlight: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl p-6 ${p.highlight ? 'bg-sky-500 text-white shadow-lg ring-2 ring-sky-500' : 'bg-white shadow-sm ring-1 ring-gray-200'}`}
              >
                <h3 className="font-semibold">{p.name}</h3>
                <p className={`mt-2 text-2xl font-bold ${p.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {p.price}
                </p>
                <p className={`mt-1 text-sm ${p.highlight ? 'text-sky-100' : 'text-gray-500'}`}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
