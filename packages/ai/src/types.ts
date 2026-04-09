export interface ChatToInvoiceInput {
  prompt: string
  tenantId: string
  locale?: 'id' | 'en'
}

export interface ChatToInvoiceOutput {
  clientName?: string
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
    unit?: string
  }>
  notes?: string
}
