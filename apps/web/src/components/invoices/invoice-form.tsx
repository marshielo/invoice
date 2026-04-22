'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToken } from '@/hooks/use-token'
import SearchableSelect from './searchable-select'
import type { InvoiceData } from './invoice-types'
import { formatRupiah } from './invoice-types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  product_id: z.string().nullable().optional(),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  quantity: z.coerce.number().min(0.001, 'Qty min 0.001'),
  unit: z.string().optional(),
  unit_price: z.coerce.number().min(0),
  tax_rate: z.coerce.number().min(0).max(100),
  sort_order: z.number().optional(),
})

const schema = z.object({
  client_id: z.string().nullable().optional(),
  issue_date: z.string().min(1, 'Tanggal terbit wajib diisi'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  items: z.array(itemSchema).min(1, 'Minimal 1 item'),
})

type FormValues = z.infer<typeof schema>

// ─── API types ────────────────────────────────────────────────────────────────

interface ClientListItem { id: string; name: string; email?: string | null }
interface ProductListItem {
  id: string; name: string; unit?: string | null;
  price: string; productType: string; isActive: boolean
}

interface Props {
  invoiceId?: string
  initialData?: InvoiceData | null
}

// ─── Row sub-component (holds its own useWatch at component top level) ────────

interface RowProps {
  idx: number
  field: { id: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<FormValues, any>
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
  canRemove: boolean
  onRemove: () => void
  productOptions: { value: string; label: string; sublabel?: string; price: string; unit?: string | null }[]
  onProductSelect: (productId: string | null) => void
  onProductSearchOpen: (q: string) => void
}

function ItemRow({
  idx, field: _field, control, register, errors, canRemove, onRemove,
  productOptions, onProductSelect, onProductSearchOpen,
}: RowProps) {
  const productId = useWatch({ control, name: `items.${idx}.product_id` }) ?? null
  const qty = Number(useWatch({ control, name: `items.${idx}.quantity` })) || 0
  const price = Number(useWatch({ control, name: `items.${idx}.unit_price` })) || 0
  const taxRate = Number(useWatch({ control, name: `items.${idx}.tax_rate` })) || 0
  const rowSubtotal = qty * price
  const rowTax = rowSubtotal * taxRate / 100

  const cellInput = 'block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

  return (
    <tr className="align-top">
      {/* Product */}
      <td className="p-2 min-w-[180px]">
        <SearchableSelect
          options={productOptions}
          value={productId}
          onChange={onProductSelect}
          onSearch={onProductSearchOpen}
          placeholder="Pilih produk..."
        />
      </td>
      {/* Description */}
      <td className="p-2 min-w-[200px]">
        <input {...register(`items.${idx}.description`)} placeholder="Deskripsi item" className={cellInput} />
        {errors.items?.[idx]?.description && (
          <p className="mt-0.5 text-xs text-red-600">{errors.items[idx]?.description?.message}</p>
        )}
      </td>
      {/* Qty */}
      <td className="p-2 w-20">
        <input
          {...register(`items.${idx}.quantity`)}
          type="number" min={0.001} step={0.001}
          className={`${cellInput} text-right`}
        />
      </td>
      {/* Unit */}
      <td className="p-2 w-20">
        <input {...register(`items.${idx}.unit`)} placeholder="pcs" className={cellInput} />
      </td>
      {/* Unit price */}
      <td className="p-2 w-32">
        <input
          {...register(`items.${idx}.unit_price`)}
          type="number" min={0} step={500}
          className={`${cellInput} text-right`}
        />
      </td>
      {/* Tax rate */}
      <td className="p-2 w-16">
        <input
          {...register(`items.${idx}.tax_rate`)}
          type="number" min={0} max={100} step={0.5}
          className={`${cellInput} text-right`}
        />
      </td>
      {/* Subtotal */}
      <td className="p-2 w-32 text-right text-sm font-medium text-gray-700 align-middle">
        {formatRupiah(rowSubtotal + rowTax)}
      </td>
      {/* Delete */}
      <td className="p-2 w-8 text-center align-middle">
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 text-lg leading-none">
            ×
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Main form component ──────────────────────────────────────────────────────

export default function InvoiceForm({ invoiceId, initialData }: Props) {
  const token = useToken()
  const router = useRouter()
  const qc = useQueryClient()
  const isEdit = !!invoiceId

  const [clientSearch, setClientSearch] = useState('')
  const [activeProductIdx, setActiveProductIdx] = useState<number | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [submitAction, setSubmitAction] = useState<'draft' | 'send'>('draft')

  // ─── Clients ─────────────────────────────────────────────────────────────

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select', clientSearch, token],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: { data: ClientListItem[] } }>(
        `/api/v1/clients?search=${encodeURIComponent(clientSearch)}&limit=30`,
        token ?? undefined,
      ),
    enabled: !!token,
  })
  const clientOptions = (clientsData?.data?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    ...(c.email ? { sublabel: c.email } : {}),
  }))

  // ─── Products ─────────────────────────────────────────────────────────────

  const { data: productsData } = useQuery({
    queryKey: ['products-select', productSearch, token],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: { data: ProductListItem[] } }>(
        `/api/v1/products?search=${encodeURIComponent(productSearch)}&active=true&limit=30`,
        token ?? undefined,
      ),
    enabled: !!token && activeProductIdx !== null,
  })
  const productOptions = (productsData?.data?.data ?? []).map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: `${formatRupiah(p.price)} / ${p.unit ?? 'unit'}`,
    price: p.price,
    unit: p.unit ?? null,
  }))

  // ─── Form ─────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0] ?? ''

  const {
    register, handleSubmit, control, setValue, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: null, issue_date: today, due_date: '', notes: '', terms: '',
      discount_amount: 0,
      items: [{ product_id: null, description: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedClientId = useWatch({ control, name: 'client_id' }) ?? null
  const watchedItems = useWatch({ control, name: 'items' }) ?? []
  const watchedDiscount = useWatch({ control, name: 'discount_amount' }) ?? 0

  useEffect(() => {
    if (initialData) {
      reset({
        client_id: initialData.clientId ?? null,
        issue_date: initialData.issueDate,
        due_date: initialData.dueDate ?? '',
        notes: initialData.notes ?? '',
        terms: initialData.terms ?? '',
        discount_amount: parseFloat(initialData.discountAmount) || 0,
        items: initialData.items.map((it) => ({
          product_id: it.productId ?? null,
          description: it.description,
          quantity: parseFloat(it.quantity),
          unit: it.unit ?? '',
          unit_price: parseFloat(it.unitPrice),
          tax_rate: parseFloat(it.taxRate),
          sort_order: it.sortOrder,
        })),
      })
    }
  }, [initialData, reset])

  // ─── Live totals ──────────────────────────────────────────────────────────

  const subtotal = watchedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
  const taxTotal = watchedItems.reduce((sum, it) => {
    const s = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
    return sum + s * (Number(it.tax_rate) || 0) / 100
  }, 0)
  const discount = Number(watchedDiscount) || 0
  const total = Math.max(0, subtotal - discount + taxTotal)

  // ─── Mutation ─────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        client_id: values.client_id || undefined,
        issue_date: values.issue_date,
        due_date: values.due_date || undefined,
        notes: values.notes || undefined,
        terms: values.terms || undefined,
        discount_amount: values.discount_amount || 0,
        items: values.items.map((it, i) => ({
          product_id: it.product_id || undefined,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit || undefined,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          sort_order: it.sort_order ?? i,
        })),
      }
      if (isEdit) {
        const res = await apiClient.patch<{ success: boolean; data: InvoiceData }>(
          `/api/v1/invoices/${invoiceId}`, body, token ?? undefined,
        )
        if (submitAction === 'send') {
          await apiClient.post(`/api/v1/invoices/${invoiceId}/send`, {}, token ?? undefined)
        }
        return res
      } else {
        const res = await apiClient.post<{ success: boolean; data: InvoiceData }>(
          '/api/v1/invoices', body, token ?? undefined,
        )
        if (submitAction === 'send') {
          const id = (res as { data?: InvoiceData })?.data?.id
          if (id) await apiClient.post(`/api/v1/invoices/${id}/send`, {}, token ?? undefined)
        }
        return res
      }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      const id = (res as { data?: InvoiceData })?.data?.id ?? invoiceId
      router.push(id ? `/invoices/${id}` : '/invoices')
    },
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  // ─── Product auto-fill ─────────────────────────────────────────────────────

  const handleProductSelect = useCallback(
    (idx: number, productId: string | null) => {
      setValue(`items.${idx}.product_id`, productId)
      if (productId) {
        const prod = (productsData?.data?.data ?? []).find((p) => p.id === productId)
        if (prod) {
          setValue(`items.${idx}.description`, prod.name)
          setValue(`items.${idx}.unit`, prod.unit ?? '')
          setValue(`items.${idx}.unit_price`, parseFloat(prod.price) || 0)
        }
      }
    },
    [productsData, setValue],
  )

  const inputCls = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'
  const labelCls = 'block text-sm font-medium text-gray-700'
  const errorCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Kembali</button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Ubah Invoice' : 'Buat Invoice Baru'}</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">

        {/* Header card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Informasi Invoice</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Pelanggan</label>
              <div className="mt-1">
                <SearchableSelect
                  options={clientOptions}
                  value={watchedClientId}
                  onChange={(v) => setValue('client_id', v)}
                  onSearch={setClientSearch}
                  placeholder="Pilih pelanggan..."
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Tanggal Terbit <span className="text-red-500">*</span></label>
              <input {...register('issue_date')} type="date" className={inputCls} />
              {errors.issue_date && <p className={errorCls}>{errors.issue_date.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Jatuh Tempo</label>
              <input {...register('due_date')} type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Diskon (Rp)</label>
              <input {...register('discount_amount')} type="number" min={0} step={1000} placeholder="0" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Item / Layanan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Produk</th>
                  <th className="px-4 py-2 text-left">Deskripsi *</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-left">Satuan</th>
                  <th className="px-4 py-2 text-right">Harga Satuan</th>
                  <th className="px-4 py-2 text-right">Pajak %</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => (
                  <ItemRow
                    key={field.id}
                    idx={idx}
                    field={field}
                    control={control}
                    register={register}
                    errors={errors}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(idx)}
                    productOptions={productOptions}
                    onProductSelect={(v) => handleProductSelect(idx, v)}
                    onProductSearchOpen={(q) => {
                      setActiveProductIdx(idx)
                      setProductSearch(q)
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-6 py-3">
            <button
              type="button"
              onClick={() => append({ product_id: null, description: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0 })}
              className="text-sm text-sky-600 hover:text-sky-800"
            >
              + Tambah baris
            </button>
          </div>
        </div>

        {/* Notes + Terms */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className={labelCls}>Catatan</label>
            <textarea {...register('notes')} rows={3} placeholder="Catatan untuk pelanggan..." className={inputCls} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className={labelCls}>Syarat & Ketentuan</label>
            <textarea {...register('terms')} rows={3} placeholder="Syarat pembayaran..." className={inputCls} />
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Diskon</span><span className="text-red-600">-{formatRupiah(discount)}</span>
              </div>
            )}
            {taxTotal > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Pajak</span><span>{formatRupiah(taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>Total</span><span>{formatRupiah(total)}</span>
            </div>
          </div>
        </div>

        {mutation.isError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Gagal menyimpan invoice. Silakan coba lagi.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button type="button" onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button type="submit" onClick={() => setSubmitAction('draft')} disabled={mutation.isPending}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {mutation.isPending && submitAction === 'draft' ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button type="submit" onClick={() => setSubmitAction('send')} disabled={mutation.isPending}
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
            {mutation.isPending && submitAction === 'send' ? 'Mengirim...' : 'Kirim Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
