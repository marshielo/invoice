import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Invoicein',
    default: 'Invoicein — Tagihan Profesional untuk UMKM Indonesia',
  },
  description:
    'Buat, kirim, dan lacak tagihan bisnis Anda via WhatsApp dan email. Solusi invoicing AI untuk UMKM Indonesia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children
}
