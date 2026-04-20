'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import type { Control, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToken } from '@/hooks/use-token'
import SearchableSelect from './searchable-select'
import type { InvoiceData } from './invoice-types'
import { formatRupiah } from './invoice-types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AIResult {
  client_id?: string | null
  issue_date: string
  due_date?: string | null
  notes?: string | null
  terms?: string | null
  discount_amount?: number | null
  items: {
    product_id?: string | null
    description: string
    quantity: number
    unit?: string | null
    unit_price: number
    tax_rate: number
  }[]
  explanation: string
}

interface Props {
  onClose: () => void
}

// ─── Schema (same as InvoiceForm) ─────────────────────────────────────────────

const itemSchema = z.object({
  product_id: z.string().nullable().optional(),
  description: z.string().min(1, 'Wajib diisi'),
  quantity: z.coerce.number().min(0.001, 'Min 0.001'),
  unit: z.string().optional(),
  unit_price: z.coerce.number().min(0),
  tax_rate: z.coerce.number().min(0).max(100),
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

// ─── Item row sub-component ───────────────────────────────────────────────────

function ItemRow({
  idx,
  register,
  control,
  canRemove,
  onRemove,
}: {
  idx: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<FormValues>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<FormValues, any>
  canRemove: boolean
  onRemove: () => void
}) {
  const qty = Number(useWatch({ control, name: `items.${idx}.quantity` })) || 0
  const price = Number(useWatch({ control, name: `items.${idx}.unit_price` })) || 0
  const taxRate = Number(useWatch({ control, name: `items.${idx}.tax_rate` })) || 0
  const rowTotal = qty * price * (1 + taxRate / 100)

  const cellCls =
    'block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

  return (
    <tr className="align-top">
      <td className="px-3 py-1.5">
        <input {...register(`items.${idx}.description`)} className={cellCls} placeholder="Deskripsi" />
      </td>
      <td className="px-3 py-1.5">
        <input
          {...register(`items.${idx}.quantity`)}
          type="number" min={0.001} step={0.001}
          className={`${cellCls} text-right`}
        />
      </td>
      <td className="px-3 py-1.5">
        <input {...register(`items.${idx}.unit`)} className={cellCls} placeholder="pcs" />
      </td>
      <td className="px-3 py-1.5">
        <input
          {...register(`items.${idx}.unit_price`)}
          type="number" min={0} step={500}
          className={`${cellCls} text-right`}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          {...register(`items.${idx}.tax_rate`)}
          type="number" min={0} max={100} step={0.5}
          className={`${cellCls} text-right`}
        />
      </td>
      <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-700 align-middle">
        {formatRupiah(rowTotal)}
      </td>
      <td className="px-3 py-1.5 text-center align-middle">
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 text-base leading-none">
            ×
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Main dialog component ────────────────────────────────────────────────────

export default function AIInvoiceDialog({ onClose }: Props) {
  const token = useToken()
  const router = useRouter()
  const qc = useQueryClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [prompt, setPrompt] = useState('')
  const [explanation, setExplanation] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')

  const today = new Date().toISOString().split('T')[0] ?? ''

  const {
    register, handleSubmit, control, setValue, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: null,
      issue_date: today,
      due_date: '',
      notes: '',
      terms: '',
      discount_amount: 0,
      items: [{ product_id: null, description: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedClientId = useWatch({ control, name: 'client_id' }) ?? null
  const watchedItems = useWatch({ control, name: 'items' }) ?? []
  const watchedDiscount = useWatch({ control, name: 'discount_amount' }) ?? 0

  // ─── Clients query ─────────────────────────────────────────────────────────

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select', clientSearch, token],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: { data: { id: string; name: string; email?: string | null }[] } }>(
        `/api/v1/clients?search=${encodeURIComponent(clientSearch)}&limit=30`,
        token ?? undefined,
      ),
    enabled: !!token && step === 2,
  })
  const clientOptions = (clientsData?.data?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    ...(c.email ? { sublabel: c.email } : {}),
  }))

  // ─── Generate mutation ─────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; data: AIResult }>(
        '/api/v1/ai/generate-invoice',
        { prompt },
        token ?? undefined,
      ),
    onSuccess: (res) => {
      const ai = res.data
      setExplanation(ai.explanation ?? '')
      setGenerateError(null)
      reset({
        client_id: ai.client_id ?? null,
        issue_date: ai.issue_date,
        due_date: ai.due_date ?? '',
        notes: ai.notes ?? '',
        terms: ai.terms ?? '',
        discount_amount: ai.discount_amount ?? 0,
        items: (ai.items ?? []).map((it) => ({
          product_id: it.product_id ?? null,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit ?? '',
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
        })),
      })
      setStep(2)
    },
    onError: () => setGenerateError('Gagal memproses prompt. Pastikan deskripsi cukup detail dan coba lagi.'),
  })

  // ─── Confirm mutation ──────────────────────────────────────────────────────

  const confirmMutation = useMutation({
    mutationFn: async (values: FormValues) =>
      apiClient.post<{ success: boolean; data: InvoiceData }>(
        '/api/v1/invoices',
        {
          client_id: values.client_id || undefined,
          issue_date: values.issue_date,
          due_date: values.due_date || undefined,
          notes: values.notes || undefined,
          terms: values.terms || undefined,
          discount_amount: values.discount_amount ?? 0,
          items: values.items.map((it, i) => ({
            product_id: it.product_id || undefined,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit || undefined,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate,
            sort_order: i,
          })),
        },
        token ?? undefined,
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      const id = res.data?.id
      onClose()
      if (id) router.push(`/invoices/${id}`)
    },
  })

  // ─── Live totals ───────────────────────────────────────────────────────────

  const subtotal = watchedItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0,
  )
  const taxTotal = watchedItems.reduce((sum, it) => {
    const s = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
    return sum + s * (Number(it.tax_rate) || 0) / 100
  }, 0)
  const discount = Number(watchedDiscount) || 0
  const total = Math.max(0, subtotal - discount + taxTotal)

  const onSubmit = handleSubmit((values) => confirmMutation.mutate(values))

  const inputCls =
    'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative my-8 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 1 ? '✨ Buat Invoice dengan AI' : '✨ Preview Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* ── Step 1: Prompt Input ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-6">
            <p className="mb-3 text-sm text-gray-600">
              Deskripsikan invoice Anda dalam bahasa Indonesia atau Inggris. Claude akan mengurai
              pelanggan, item, harga, dan jatuh tempo secara otomatis.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                setGenerateError(null)
              }}
              rows={4}
              placeholder="Contoh: Invoice untuk PT Maju, desain logo 500rb, konsultasi 3 jam @200rb/jam, due 30 April"
              className={`${inputCls} resize-none`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && prompt.trim().length >= 10) {
                  generateMutation.mutate()
                }
              }}
            />
            <p className="mt-1 text-xs text-gray-400">Ctrl+Enter untuk generate</p>

            {generateError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {generateError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenerateError(null)
                  generateMutation.mutate()
                }}
                disabled={generateMutation.isPending || prompt.trim().length < 10}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {generateMutation.isPending ? 'Claude sedang memproses...' : 'Generate ✨'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview & Edit ───────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {/* AI explanation */}
            {explanation && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="mb-1 text-xs font-semibold text-sky-700">Yang Claude pahami:</p>
                <p className="text-sm text-sky-900">{explanation}</p>
              </div>
            )}

            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Pelanggan</label>
                <SearchableSelect
                  options={clientOptions}
                  value={watchedClientId}
                  onChange={(v) => setValue('client_id', v)}
                  onSearch={setClientSearch}
                  placeholder="Pilih pelanggan..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Tanggal Terbit <span className="text-red-500">*</span>
                </label>
                <input {...register('issue_date')} type="date" className={inputCls} />
                {errors.issue_date && (
                  <p className="mt-0.5 text-xs text-red-600">{errors.issue_date.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Jatuh Tempo</label>
                <input {...register('due_date')} type="date" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Diskon (Rp)</label>
                <input
                  {...register('discount_amount')}
                  type="number" min={0} step={1000} placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Item / Layanan</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Deskripsi *</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-left">Satuan</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Pajak %</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field, idx) => (
                      <ItemRow
                        key={field.id}
                        idx={idx}
                        register={register}
                        control={control}
                        canRemove={fields.length > 1}
                        onRemove={() => remove(idx)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-2">
                <button
                  type="button"
                  onClick={() =>
                    append({ product_id: null, description: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0 })
                  }
                  className="text-xs text-sky-600 hover:text-sky-800"
                >
                  + Tambah baris
                </button>
              </div>
            </div>

            {/* Live totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Diskon</span>
                    <span className="text-red-600">-{formatRupiah(discount)}</span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Pajak</span>
                    <span>{formatRupiah(taxTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatRupiah(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes / Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Catatan</label>
                <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Syarat & Ketentuan</label>
                <textarea {...register('terms')} rows={2} className={`${inputCls} resize-none`} />
              </div>
            </div>

            {confirmMutation.isError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Gagal membuat invoice. Silakan coba lagi.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Ubah Prompt
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={confirmMutation.isPending}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {confirmMutation.isPending ? 'Membuat...' : 'Konfirmasi & Buat Invoice'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
