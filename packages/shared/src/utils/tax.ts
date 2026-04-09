import { PPN_RATE } from '../constants/index.js'

/**
 * Calculate PPN (tax) amount from a base amount.
 * Uses Indonesian rounding rules (round half-up).
 */
export function calculatePPN(baseAmount: number, rate: number = PPN_RATE): number {
  return Math.round(baseAmount * rate)
}

/**
 * Calculate line total before tax.
 * discount is 0-100 (percentage).
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
): number {
  const gross = quantity * unitPrice
  const discount = gross * (discountPercent / 100)
  return Math.round(gross - discount)
}

/**
 * Calculate invoice totals from line items.
 */
export interface InvoiceTotalsInput {
  lines: Array<{
    quantity: number
    unitPrice: number
    discountPercent: number
    isTaxable: boolean
    taxRate?: number
  }>
  invoiceDiscountType: 'percentage' | 'fixed'
  invoiceDiscountValue: number
}

export interface InvoiceTotals {
  subtotal: number
  invoiceDiscount: number
  taxableAmount: number
  taxAmount: number
  total: number
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  // 1. Sum all line totals (before tax)
  const subtotal = input.lines.reduce((sum, line) => {
    return sum + calculateLineTotal(line.quantity, line.unitPrice, line.discountPercent)
  }, 0)

  // 2. Apply invoice-level discount
  const invoiceDiscount =
    input.invoiceDiscountType === 'percentage'
      ? Math.round(subtotal * (input.invoiceDiscountValue / 100))
      : Math.round(input.invoiceDiscountValue)

  const discountedSubtotal = subtotal - invoiceDiscount

  // 3. Calculate tax on taxable lines (after proportional discount)
  const totalLineTotals = input.lines.reduce(
    (sum, line) => sum + calculateLineTotal(line.quantity, line.unitPrice, line.discountPercent),
    0,
  )

  const taxableLineTotals = input.lines
    .filter((l) => l.isTaxable)
    .reduce((sum, line) => sum + calculateLineTotal(line.quantity, line.unitPrice, line.discountPercent), 0)

  // Proportionally apply invoice discount to taxable portion
  const discountRatio = totalLineTotals > 0 ? discountedSubtotal / totalLineTotals : 1
  const taxableAmount = Math.round(taxableLineTotals * discountRatio)
  const taxAmount = input.lines
    .filter((l) => l.isTaxable)
    .reduce((sum, line) => {
      const lineTotal = calculateLineTotal(line.quantity, line.unitPrice, line.discountPercent)
      const adjustedLineTotal = Math.round(lineTotal * discountRatio)
      return sum + calculatePPN(adjustedLineTotal, line.taxRate ?? PPN_RATE)
    }, 0)

  const total = discountedSubtotal + taxAmount

  return {
    subtotal,
    invoiceDiscount,
    taxableAmount,
    taxAmount,
    total,
  }
}
