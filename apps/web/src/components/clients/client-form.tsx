'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  npwp: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

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
}

interface Props {
  token: string | null
  client: ClientData | null
  onClose: () => void
  onSaved: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientForm({ token, client, onClose, onSaved }: Props) {
  const isEdit = !!client

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      npwp: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        province: client.province ?? '',
        postal_code: client.postalCode ?? '',
        npwp: client.npwp ?? '',
        notes: client.notes ?? '',
      })
    } else {
      reset({
        name: '', email: '', phone: '', address: '',
        city: '', province: '', postal_code: '', npwp: '', notes: '',
      })
    }
  }, [client, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body: Record<string, string | undefined> = {}
      Object.entries(values).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) body[k] = v
      })
      if (isEdit) {
        return apiClient.patch(`/api/v1/clients/${client!.id}`, body, token ?? undefined)
      }
      return apiClient.post('/api/v1/clients', body, token ?? undefined)
    },
    onSuccess: () => onSaved(),
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  const inputCls =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'
  const labelCls = 'block text-sm font-medium text-gray-700'
  const errorCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Ubah Pelanggan' : 'Tambah Pelanggan'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Nama <span className="text-red-500">*</span></label>
            <input {...register('name')} placeholder="PT Contoh Maju" className={inputCls} />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <input {...register('email')} type="email" placeholder="kontak@example.com" className={inputCls} />
            {errors.email && <p className={errorCls}>{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>Nomor Telepon / WhatsApp</label>
            <input {...register('phone')} placeholder="081234567890" className={inputCls} />
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Alamat</label>
            <textarea {...register('address')} rows={2} placeholder="Jl. Contoh No. 1" className={inputCls} />
          </div>

          {/* City + Province */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kota</label>
              <input {...register('city')} placeholder="Jakarta" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Provinsi</label>
              <input {...register('province')} placeholder="DKI Jakarta" className={inputCls} />
            </div>
          </div>

          {/* Postal code + NPWP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kode Pos</label>
              <input {...register('postal_code')} placeholder="10110" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>NPWP</label>
              <input {...register('npwp')} placeholder="00.000.000.0-000.000" className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Catatan Internal</label>
            <textarea {...register('notes')} rows={3} placeholder="Catatan untuk tim internal..." className={inputCls} />
          </div>

          {mutation.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Gagal menyimpan. Silakan coba lagi.
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form=""
            onClick={onSubmit}
            disabled={isSubmitting || mutation.isPending}
            className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
          </button>
        </div>
      </div>
    </div>
  )
}
