'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  description: z.string().optional(),
  unit: z.string().optional(),
  price: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
  product_type: z.enum(['product', 'service']),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface ProductData {
  id: string
  name: string
  description?: string | null
  unit?: string | null
  price: string
  productType: string
  isActive: boolean
}

interface Props {
  token: string | null
  product: ProductData | null
  onClose: () => void
  onSaved: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductForm({ token, product, onClose, onSaved }: Props) {
  const isEdit = !!product

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      unit: '',
      price: 0,
      product_type: 'product',
      is_active: true,
    },
  })

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        unit: product.unit ?? '',
        price: parseFloat(product.price) || 0,
        product_type: (product.productType as 'product' | 'service') ?? 'product',
        is_active: product.isActive,
      })
    } else {
      reset({ name: '', description: '', unit: '', price: 0, product_type: 'product', is_active: true })
    }
  }, [product, reset])

  const isActive = watch('is_active')

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        description: values.description || undefined,
        unit: values.unit || undefined,
        price: values.price,
        product_type: values.product_type,
        is_active: values.is_active,
      }
      if (isEdit) {
        return apiClient.patch(`/api/v1/products/${product!.id}`, body, token ?? undefined)
      }
      return apiClient.post('/api/v1/products', body, token ?? undefined)
    },
    onSuccess: () => onSaved(),
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  const inputCls =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'
  const labelCls = 'block text-sm font-medium text-gray-700'
  const errorCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Ubah Produk' : 'Tambah Produk'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Nama Produk <span className="text-red-500">*</span></label>
            <input {...register('name')} placeholder="Jasa Desain Logo" className={inputCls} />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          {/* Product type */}
          <div>
            <label className={labelCls}>Tipe</label>
            <div className="mt-2 flex gap-4">
              {(['product', 'service'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    {...register('product_type')}
                    className="h-4 w-4 text-sky-600"
                  />
                  <span className="text-sm text-gray-700">
                    {type === 'product' ? 'Produk Fisik' : 'Layanan / Jasa'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Deskripsi</label>
            <textarea {...register('description')} rows={2} placeholder="Deskripsi singkat produk..." className={inputCls} />
          </div>

          {/* Unit + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Satuan</label>
              <input {...register('unit')} placeholder="pcs / jam / paket" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Harga (Rp)</label>
              <input
                {...register('price')}
                type="number"
                min={0}
                step={500}
                placeholder="500000"
                className={inputCls}
              />
              {errors.price && <p className={errorCls}>{errors.price.message}</p>}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Produk Aktif</p>
              <p className="text-xs text-gray-500">Produk nonaktif tidak muncul saat membuat tagihan</p>
            </div>
            <button
              type="button"
              onClick={() => setValue('is_active', !isActive)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                isActive ? 'bg-sky-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
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
            onClick={onSubmit}
            disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </div>
      </div>
    </div>
  )
}
