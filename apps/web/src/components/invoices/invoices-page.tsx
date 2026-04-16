'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToken } from '@/hooks/use-token'
import { apiClient } from '@/lib/api-client'
import type {
  InvoiceListItem,
  InvoicesListResponse,
  InvoiceStatus,
} from './invoice-types'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatRupiah,
  formatDate,
} from './invoice-types'

interface ApiResponse<T> {
  success: boolean
  data: T
}

type TabFilter = 'all' | InvoiceStatus

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Terkirim' },
  { key: 'partial', label: 'Parsial' },
  { key: 'paid', label: 'Lunas' },
  { key: 'overdue', label: 'Jatuh Tempo' },
  { key: 'cancelled', label: 'Dibatalkan' },
]

const LIMIT = 20

export default function InvoicesPage() {
  const token = useToken()
  const router = useRouter()
  const qc = useQueryClient()

  const [tab, setTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<InvoiceListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(tab !== 'all' ? { status: tab } : {}),
    ...(search ? { search } : {}),
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  }).toString()

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', tab, search, fromDate, toDate, page, token],
    queryFn: () =>
      apiClient.get<ApiResponse<InvoicesListResponse>>(
        `/api/v1/invoices?${params}`,
        token ?? undefined,
      ),
    enabled: !!token,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/invoices/${id}`, token ?? undefined),
    onSuccess: () => {
      setDeleting(null)
      setDeleteError(null)
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => setDeleteError('Invoice ini tidak dapat dihapus (hanya status draft yang bisa dihapus).'),
  })

  const handleDelete = useCallback((inv: InvoiceListItem) => {
    setDeleting(inv)
    setDeleteError(null)
  }, [])

  const invoices = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  const inputCls =
    'block rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola tagihan dan pembayaran bisnis Anda</p>
        </div>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          + Buat Invoice
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1) }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari nomor invoice..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className={`${inputCls} w-56`}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          className={`${inputCls}`}
          title="Dari tanggal"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          className={`${inputCls}`}
          title="Sampai tanggal"
        />
        {(search || fromDate || toDate) && (
          <button
            onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setPage(1) }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Memuat...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">Gagal memuat data invoice.</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {search || tab !== 'all' ? 'Tidak ada invoice yang cocok.' : 'Belum ada invoice. Buat invoice pertama Anda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nomor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tgl. Dibuat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jatuh Tempo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Terbayar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-sky-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {inv.clientName ?? <span className="text-gray-400 italic">Tanpa pelanggan</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatRupiah(inv.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                      {formatRupiah(inv.amountPaid)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/invoices/${inv.id}/edit`}
                        className="mr-3 text-sky-600 hover:text-sky-800"
                      >
                        Ubah
                      </Link>
                      {inv.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(inv)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{total} invoice · Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Hapus Invoice</h2>
            <p className="mt-2 text-sm text-gray-600">
              Yakin ingin menghapus invoice <strong>{deleting.invoiceNumber}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setDeleting(null); setDeleteError(null) }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleting.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
