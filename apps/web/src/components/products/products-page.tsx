'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToken } from '@/hooks/use-token'
import { apiClient, ApiError } from '@/lib/api-client'
import ProductForm from './product-form'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductData {
  id: string
  name: string
  description?: string | null
  unit?: string | null
  price: string
  productType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ProductsListResponse {
  data: ProductData[]
  total: number
  page: number
  limit: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

type TabFilter = 'all' | 'product' | 'service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const token = useToken()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductData | null>(null)
  const [deleting, setDeleting] = useState<ProductData | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const LIMIT = 20

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(search ? { search } : {}),
    ...(tab !== 'all' ? { type: tab } : {}),
  }).toString()

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', search, tab, page, token],
    queryFn: () =>
      apiClient.get<ApiResponse<ProductsListResponse>>(
        `/api/v1/products?${queryParams}`,
        token ?? undefined,
      ),
    enabled: !!token,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/api/v1/products/${id}`, { is_active: isActive }, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/products/${id}`, token ?? undefined),
    onSuccess: () => {
      setDeleting(null)
      setDeleteError(null)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError('Produk ini digunakan pada tagihan dan tidak dapat dihapus.')
      } else {
        setDeleteError('Gagal menghapus produk. Coba lagi.')
      }
    },
  })

  const handleEdit = useCallback((product: ProductData) => {
    setEditing(product)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((product: ProductData) => {
    setDeleting(product)
    setDeleteError(null)
  }, [])

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setEditing(null)
  }, [])

  const products = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  const inputCls =
    'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'product', label: 'Produk' },
    { key: 'service', label: 'Layanan' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk & Layanan</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola katalog produk dan layanan Anda</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          + Tambah Produk
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1) }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="sm:w-72">
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className={inputCls}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Memuat...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">Gagal memuat data produk.</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {search ? 'Tidak ada produk yang cocok.' : 'Belum ada produk. Tambahkan produk pertama Anda.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Satuan</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Harga</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aktif</th>
                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{product.description}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      product.productType === 'service'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {product.productType === 'service' ? 'Layanan' : 'Produk'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {product.unit ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatRupiah(product.price)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: product.id, isActive: !product.isActive })}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                        product.isActive ? 'bg-sky-600' : 'bg-gray-200'
                      }`}
                      aria-label="Toggle aktif"
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          product.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(product)}
                      className="mr-3 text-sky-600 hover:text-sky-800"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{total} produk · Halaman {page} dari {totalPages}</span>
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

      {/* Create/Edit Form */}
      {formOpen && (
        <ProductForm
          token={token}
          product={editing}
          onClose={handleFormClose}
          onSaved={() => {
            handleFormClose()
            qc.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Hapus Produk</h2>
            <p className="mt-2 text-sm text-gray-600">
              Yakin ingin menghapus <strong>{deleting.name}</strong>? Tindakan ini tidak dapat dibatalkan.
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
