import { describe, expect, it } from 'vitest'
import { generateInvoiceNumber } from '../invoice-number.js'

describe('generateInvoiceNumber', () => {
  const date = new Date('2026-04-09')

  it('generates PREFIX/YYYY/MM/SEQ format', () =>
    expect(generateInvoiceNumber('{PREFIX}/{YYYY}/{MM}/{SEQ}', 'INV', 1, date)).toBe(
      'INV/2026/04/0001',
    ))

  it('generates PREFIX/YYYY/SEQ format', () =>
    expect(generateInvoiceNumber('{PREFIX}/{YYYY}/{SEQ}', 'INV', 42, date)).toBe('INV/2026/0042'))

  it('generates PREFIX-SEQ format', () =>
    expect(generateInvoiceNumber('{PREFIX}-{SEQ}', 'QUO', 7, date)).toBe('QUO-0007'))

  it('pads sequence correctly', () =>
    expect(generateInvoiceNumber('{PREFIX}/{SEQ}', 'INV', 999, date)).toBe('INV/0999'))

  it('handles seq > padding length', () =>
    expect(generateInvoiceNumber('{PREFIX}/{SEQ}', 'INV', 12345, date)).toBe('INV/12345'))
})
