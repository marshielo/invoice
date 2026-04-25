'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToken } from '@/hooks/use-token'
import InvoiceForm from '@/components/invoices/invoice-form'
import type { InvoiceData } from '@/components/invoices/invoice-types'

interface Props {
  params: Promise<{ id: string }>
}

export default function Page({ params }: Props) {
  const { id } = use(params)
  const token = useToken()

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id, token],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: InvoiceData }>(`/api/v1/invoices/${id}`, token ?? undefined),
    enabled: !!token,
  })

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Memuat...</div>
  }

  return <InvoiceForm invoiceId={id} initialData={data?.data ?? null} />
}
