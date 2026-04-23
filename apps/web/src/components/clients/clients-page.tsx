'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToken } from '@/hooks/use-token'
import { apiClient, ApiError } from '@/lib/api-client'
import ClientForm from './client-form'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientData {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  npwp?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

interface ClientsListResponse {
  data: ClientData[]
  total: number
  page: number
  limit: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const token = useToken()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClientData | null>(null)
  const [deleting, setDeleting] = useState<ClientData | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const LIMIT = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', debouncedSearch, page, token],
    queryFn: () =>
      apiClient.get<ApiResponse<ClientsListResponse>>(
        `/api/v1/clients?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${LIMIT}`,
        token ?? undefined,
      ),
    enabled: !!token,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/clients/${id}`, token ?? undefined),
    onSuccess: () => {
      setDeleting(null)
      setDeleteError(null)
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError('Pelanggan ini memiliki tagihan aktif dan tidak dapat dihapus.')
      } else {
        setDeleteError('Gagal menghapus pelanggan. Coba lagi.')
      }
    },
  })

  const handleEdit = useCallback((client: ClientData) => {
    setEditing(client)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((client: ClientData) => {
    setDeleting(client)
    setDeleteError(null)
  }, [])

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setEditing(null)
  }, [])

  const clients = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  const inputCls =
    'block w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pelanggan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola data pelanggan bisnis Anda</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          + Tambah Pelanggan
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama, email, atau nomor telepon..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className={inputCls}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">Gagal memuat data pelanggan.</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? 'Tidak ada pelanggan yang cocok.' : 'Belum ada pelanggan. Tambahkan pelanggan pertama Anda.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Telepon</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Kota</th>
                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted">
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm font-medium text-foreground">{client.name}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {client.email ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {client.phone ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {client.city ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(client)}
                      className="mr-3 text-primary hover:text-accent"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
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
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} pelanggan · Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border px-3 py-1 hover:bg-muted disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border px-3 py-1 hover:bg-muted disabled:opacity-40"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Form Slide-over */}
      {formOpen && (
        <ClientForm
          token={token}
          client={editing}
          onClose={handleFormClose}
          onSaved={() => {
            handleFormClose()
            qc.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Hapus Pelanggan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Yakin ingin menghapus <strong>{deleting.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setDeleting(null); setDeleteError(null) }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
