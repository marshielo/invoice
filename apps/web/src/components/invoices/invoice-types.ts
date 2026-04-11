// ─── Shared invoice types used across invoice components ─────────────────────

export interface InvoiceItemData {
  id: string
  productId?: string | null
  description: string
  quantity: string
  unit?: string | null
  unitPrice: string
  subtotal: string
  taxRate: string
  taxAmount: string
  sortOrder: number
}

export interface InvoicePaymentData {
  id: string
  amount: string
  paymentMethod?: string | null
  paymentDate: string
  referenceNumber?: string | null
  proofUrl?: string | null
  notes?: string | null
  createdAt: string
}

export interface InvoiceData {
  id: string
  tenantId: string
  clientId?: string | null
  clientName?: string | null
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: string
  dueDate?: string | null
  subtotal: string
  discountAmount: string
  taxAmount: string
  total: string
  amountPaid: string
  notes?: string | null
  terms?: string | null
  pdfUrl?: string | null
  sentAt?: string | null
  paidAt?: string | null
  items: InvoiceItemData[]
  payments: InvoicePaymentData[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceListItem {
  id: string
  clientId?: string | null
  clientName?: string | null
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: string
  dueDate?: string | null
  total: string
  amountPaid: string
  createdAt: string
}

export interface InvoicesListResponse {
  data: InvoiceListItem[]
  total: number
  page: number
  limit: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Terkirim',
  partial: 'Parsial',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
  cancelled: 'Dibatalkan',
}

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}
