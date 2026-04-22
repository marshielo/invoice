import { describe, expect, it } from 'vitest'
import { calculateInvoiceTotals, calculateLineTotal, calculatePPN } from '../tax'

describe('calculatePPN', () => {
  it('calculates 11% PPN', () => expect(calculatePPN(1000000)).toBe(110000))
  it('rounds correctly', () => expect(calculatePPN(100)).toBe(11))
  it('accepts custom rate', () => expect(calculatePPN(1000000, 0.12)).toBe(120000))
})

describe('calculateLineTotal', () => {
  it('basic: qty * price', () => expect(calculateLineTotal(2, 50000)).toBe(100000))
  it('applies discount', () => expect(calculateLineTotal(1, 100000, 10)).toBe(90000))
  it('handles 100% discount', () => expect(calculateLineTotal(1, 100000, 100)).toBe(0))
})

describe('calculateInvoiceTotals', () => {
  it('calculates simple invoice with PPN', () => {
    const result = calculateInvoiceTotals({
      lines: [{ quantity: 2, unitPrice: 500000, discountPercent: 0, isTaxable: true }],
      invoiceDiscountType: 'percentage',
      invoiceDiscountValue: 0,
    })
    expect(result.subtotal).toBe(1000000)
    expect(result.taxAmount).toBe(110000)
    expect(result.total).toBe(1110000)
  })

  it('applies invoice-level percentage discount', () => {
    const result = calculateInvoiceTotals({
      lines: [{ quantity: 1, unitPrice: 1000000, discountPercent: 0, isTaxable: false }],
      invoiceDiscountType: 'percentage',
      invoiceDiscountValue: 10,
    })
    expect(result.invoiceDiscount).toBe(100000)
    expect(result.total).toBe(900000)
  })

  it('applies invoice-level fixed discount', () => {
    const result = calculateInvoiceTotals({
      lines: [{ quantity: 1, unitPrice: 1000000, discountPercent: 0, isTaxable: false }],
      invoiceDiscountType: 'fixed',
      invoiceDiscountValue: 50000,
    })
    expect(result.invoiceDiscount).toBe(50000)
    expect(result.total).toBe(950000)
  })
})
