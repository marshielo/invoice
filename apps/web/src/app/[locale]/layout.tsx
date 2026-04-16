import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Fraunces, DM_Sans } from 'next/font/google'
import { QueryProvider } from '@/components/providers/query-provider'
import { locales, type Locale } from '@/i18n/config'
import '../globals.css'

// Humanist serif — editorial headings, pull quotes, display text
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
})

// Clean geometric sans — body, UI labels, captions
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}): Promise<React.ReactNode> {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${fraunces.variable} ${dmSans.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
