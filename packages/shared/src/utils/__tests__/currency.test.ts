import { describe, expect, it } from 'vitest'
import { formatRupiah, formatRupiahCompact, parseRupiah } from '../currency'

describe('formatRupiah', () => {
  it('formats zero', () => expect(formatRupiah(0)).toBe('Rp 0'))
  it('formats thousands', () => expect(formatRupiah(1500)).toBe('Rp 1.500'))
  it('formats millions', () => expect(formatRupiah(1500000)).toBe('Rp 1.500.000'))
  it('rounds decimals', () => expect(formatRupiah(1500000.5)).toBe('Rp 1.500.001'))
  it('formats large amounts', () => expect(formatRupiah(150000000)).toBe('Rp 150.000.000'))
})

describe('formatRupiahCompact', () => {
  it('formats below 1000', () => expect(formatRupiahCompact(500)).toBe('Rp 500'))
  it('formats ribuan', () => expect(formatRupiahCompact(15000)).toBe('Rp 15 rb'))
  it('formats jutaan', () => expect(formatRupiahCompact(1500000)).toBe('Rp 1,5 jt'))
  it('formats miliaran', () => expect(formatRupiahCompact(1200000000)).toBe('Rp 1,2 M'))
})

describe('parseRupiah', () => {
  it('parses formatted Rupiah', () => expect(parseRupiah('Rp 1.500.000')).toBe(1500000))
  it('parses without prefix', () => expect(parseRupiah('1.500.000')).toBe(1500000))
  it('returns 0 for invalid input', () => expect(parseRupiah('abc')).toBe(0))
  it('handles round-trip', () => expect(parseRupiah(formatRupiah(99500))).toBe(99500))
})
