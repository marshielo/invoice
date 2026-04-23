'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { useToken } from '@/hooks/use-token'
import type {
  InvoiceData,
  InvoiceStatus,
} from './invoice-types'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatRupiah,
  formatDate,
} from './invoice-types'

interface ApiResponse<T> { success: boolean; data: T }

// ─── Payment form schema ───────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Jumlah harus lebih dari 0'),
  payment_method: z.string().optional(),
  payment_date: z.string().min(1, 'Tanggal pembayaran wajib diisi'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})
type PaymentFormValues = z.infer<typeof paymentSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const token = useToken()
  const router = useRouter()
  const qc = useQueryClient()

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [whatsappSuccess, setWhatsappSuccess] = useState(false)
  const [paymentLink, setPaymentLink] = useState<{ redirectUrl: string; orderID: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId, token],
    queryFn: () =>
      apiClient.get<ApiResponse<InvoiceData>>(`/api/v1/invoices/${invoiceId}`, token ?? undefined),
    enabled: !!token,
  })

  const inv = data?.data

  // ─── Status actions ────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/invoices/${invoiceId}/send`, {}, token ?? undefined),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => setActionError('Gagal mengirim invoice.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/invoices/${invoiceId}/cancel`, {}, token ?? undefined),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => setActionError('Gagal membatalkan invoice.'),
  })

  const whatsappMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/invoices/${invoiceId}/send-whatsapp`, {}, token ?? undefined),
    onSuccess: () => {
      setActionError(null)
      setWhatsappSuccess(true)
      setTimeout(() => setWhatsappSuccess(false), 4000)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim WhatsApp.'
      setActionError(msg)
    },
  })

  // ─── Payment form ──────────────────────────────────────────────────────────

  const {
    register: registerPayment, handleSubmit: handlePaymentSubmit, reset: resetPayment,
    formState: { errors: payErrors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      payment_method: '',
      payment_date: new Date().toISOString().split('T')[0] ?? '',
      reference_number: '',
      notes: '',
    },
  })

  const createPaymentMutation = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      apiClient.post(`/api/v1/invoices/${invoiceId}/payments`, {
        amount: values.amount,
        payment_method: values.payment_method || undefined,
        payment_date: values.payment_date,
        reference_number: values.reference_number || undefined,
        notes: values.notes || undefined,
      }, token ?? undefined),
    onSuccess: () => {
      resetPayment()
      setShowPaymentForm(false)
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => setActionError('Gagal mencatat pembayaran.'),
  })

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiClient.delete(`/api/v1/invoices/${invoiceId}/payments/${paymentId}`, token ?? undefined),
    onSuccess: () => {
      setDeletePaymentId(null)
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => setActionError('Gagal menghapus pembayaran.'),
  })

  const onPaymentSubmit = handlePaymentSubmit((values) => createPaymentMutation.mutate(values))

  // ─── Midtrans payment link ─────────────────────────────────────────────────

  const paymentLinkMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; data: { snap_token: string; redirect_url: string; order_id: string } }>(
        `/api/v1/invoices/${invoiceId}/payment-link`,
        {},
        token ?? undefined,
      ),
    onSuccess: (res) => {
      setPaymentLink({ redirectUrl: res.data.redirect_url, orderID: res.data.order_id })
      setActionError(null)
    },
    onError: () => setActionError('Gagal membuat link pembayaran.'),
  })

  const handleCopyLink = () => {
    if (!paymentLink) return
    void navigator.clipboard.writeText(paymentLink.redirectUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Memuat...</div>
  }
  if (error || !inv) {
    return <div className="p-8 text-center text-sm text-red-600">Invoice tidak ditemukan.</div>
  }

  const total = parseFloat(inv.total) || 0
  const amountPaid = parseFloat(inv.amountPaid) || 0
  const paidPercent = total > 0 ? Math.min(100, (amountPaid / total) * 100) : 0
  const canEdit = inv.status === 'draft'
  const canSend = inv.status === 'draft'
  const canCancel = inv.status === 'sent' || inv.status === 'partial'
  const canPay = inv.status === 'sent' || inv.status === 'partial'
  const canWhatsApp = inv.status === 'sent' || inv.status === 'partial'

  const inputCls = 'mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'
  const labelCls = 'block text-sm font-medium text-foreground'
  const errorCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="mx-auto max-w-4xl">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/invoices')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Invoice
          </button>
          <span className="text-border">/</span>
          <h1 className="text-xl font-bold font-display text-foreground">{inv.invoiceNumber}</h1>
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href={`/invoices/${invoiceId}/edit`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Ubah
            </Link>
          )}
          {canSend && (
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60"
            >
              {sendMutation.isPending ? 'Mengirim...' : 'Kirim'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {cancelMutation.isPending ? 'Membatalkan...' : 'Batalkan'}
            </button>
          )}
          {canWhatsApp && (
            <button
              onClick={() => whatsappMutation.mutate()}
              disabled={whatsappMutation.isPending}
              className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
            >
              {whatsappMutation.isPending ? 'Mengirim...' : '💬 WhatsApp'}
            </button>
          )}
          {inv.pdfUrl && (
            <a
              href={inv.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              ↓ PDF
            </a>
          )}
        </div>
      </div>

      {whatsappSuccess && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ✅ Pesan WhatsApp berhasil dikirim ke pelanggan.
        </p>
      )}
      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: invoice details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pelanggan</p>
                <p className="mt-1 font-medium text-foreground">{inv.clientName ?? <span className="italic text-muted-foreground">Tanpa pelanggan</span>}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nomor Invoice</p>
                <p className="mt-1 font-medium text-foreground">{inv.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tanggal Terbit</p>
                <p className="mt-1 text-foreground">{formatDate(inv.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jatuh Tempo</p>
                <p className="mt-1 text-foreground">{formatDate(inv.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Deskripsi</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Harga</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Pajak</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inv.items.map((item) => {
                  const sub = parseFloat(item.subtotal) + parseFloat(item.taxAmount)
                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-foreground">{item.description}</p>
                        {item.unit && <p className="text-xs text-muted-foreground">{item.unit}</p>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-foreground">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-muted-foreground">
                        {parseFloat(item.taxRate) > 0 ? `${item.taxRate}%` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-medium text-foreground">
                        {formatRupiah(sub)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {/* Totals */}
            <div className="border-t border-border px-6 py-4">
              <div className="ml-auto w-64 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{formatRupiah(inv.subtotal)}</span>
                </div>
                {parseFloat(inv.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Diskon</span><span className="text-red-600">-{formatRupiah(inv.discountAmount)}</span>
                  </div>
                )}
                {parseFloat(inv.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Pajak</span><span>{formatRupiah(inv.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                  <span>Total</span><span>{formatRupiah(inv.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(inv.notes || inv.terms) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {inv.notes && (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Catatan</p>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{inv.notes}</p>
                </div>
              )}
              {inv.terms && (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Syarat & Ketentuan</p>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{inv.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: payment summary */}
        <div className="space-y-6">

          {/* Payment progress */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pembayaran</p>
            <div className="mt-3">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Terbayar</span>
                <span className="font-medium text-foreground">{formatRupiah(inv.amountPaid)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{paidPercent.toFixed(0)}%</span>
                <span>{formatRupiah(inv.total)}</span>
              </div>
            </div>
            {total > amountPaid && (
              <p className="mt-2 text-sm font-medium text-orange-600">
                Sisa: {formatRupiah(total - amountPaid)}
              </p>
            )}
            {canPay && (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="mt-4 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-accent"
              >
                + Catat Pembayaran
              </button>
            )}
          </div>

          {/* Midtrans payment link */}
          {canPay && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link Pembayaran Midtrans</p>

              {paymentLink ? (
                <div className="mt-3 space-y-3">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(paymentLink.redirectUrl)}`}
                      alt="QR Code Pembayaran"
                      className="rounded-lg border border-border"
                      width={160}
                      height={160}
                    />
                  </div>
                  {/* URL */}
                  <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground break-all">
                    {paymentLink.redirectUrl}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      {linkCopied ? '✓ Tersalin' : 'Salin Link'}
                    </button>
                    <a
                      href={paymentLink.redirectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-lg bg-green-600 py-1.5 text-center text-xs font-medium text-white hover:bg-green-700"
                    >
                      Buka ↗
                    </a>
                  </div>
                  <button
                    onClick={() => paymentLinkMutation.mutate()}
                    disabled={paymentLinkMutation.isPending}
                    className="w-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    Buat link baru
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => paymentLinkMutation.mutate()}
                  disabled={paymentLinkMutation.isPending}
                  className="mt-3 w-full rounded-lg border border-border bg-secondary py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                >
                  {paymentLinkMutation.isPending ? 'Membuat...' : '🔗 Buat Link Midtrans'}
                </button>
              )}
            </div>
          )}

          {/* Payment history */}
          {inv.payments.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Riwayat Pembayaran</p>
              </div>
              <div className="divide-y divide-border">
                {inv.payments.map((p) => (
                  <div key={p.id} className="flex items-start justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatRupiah(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</p>
                      {p.paymentMethod && (
                        <p className="text-xs text-muted-foreground capitalize">{p.paymentMethod.replace('_', ' ')}</p>
                      )}
                      {p.referenceNumber && (
                        <p className="text-xs text-muted-foreground">Ref: {p.referenceNumber}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeletePaymentId(p.id)}
                      className="ml-2 text-xs text-red-400 hover:text-red-600"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record payment modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Catat Pembayaran</h2>
            <form onSubmit={onPaymentSubmit} className="mt-4 space-y-4">
              <div>
                <label className={labelCls}>Jumlah (Rp) <span className="text-red-500">*</span></label>
                <input {...registerPayment('amount')} type="number" min={0.01} step={1000} className={inputCls} />
                {payErrors.amount && <p className={errorCls}>{payErrors.amount.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Metode Pembayaran</label>
                <select {...registerPayment('payment_method')} className={inputCls}>
                  <option value="">Pilih metode...</option>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="e_wallet">E-Wallet</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Tanggal Pembayaran <span className="text-red-500">*</span></label>
                <input {...registerPayment('payment_date')} type="date" className={inputCls} />
                {payErrors.payment_date && <p className={errorCls}>{payErrors.payment_date.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Nomor Referensi</label>
                <input {...registerPayment('reference_number')} placeholder="No. transaksi / bukti" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <input {...registerPayment('notes')} placeholder="Catatan opsional" className={inputCls} />
              </div>
              {createPaymentMutation.isError && (
                <p className="text-sm text-red-600">Gagal mencatat pembayaran. Coba lagi.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPaymentForm(false); resetPayment() }}
                  className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60"
                >
                  {createPaymentMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete payment confirm */}
      {deletePaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Hapus Pembayaran</h2>
            <p className="mt-2 text-sm text-muted-foreground">Yakin ingin menghapus catatan pembayaran ini?</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeletePaymentId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={() => deletePaymentMutation.mutate(deletePaymentId)}
                disabled={deletePaymentMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletePaymentMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-muted text-foreground'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
