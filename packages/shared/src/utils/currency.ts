/**
 * Format a number as Indonesian Rupiah.
 * formatRupiah(1500000) → "Rp 1.500.000"
 * formatRupiah(1500000.5) → "Rp 1.500.001" (rounded)
 */
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount)
  return (
    'Rp ' +
    rounded.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  )
}

/**
 * Format as compact Rupiah for display in tight spaces.
 * formatRupiahCompact(1500000) → "Rp 1,5 jt"
 * formatRupiahCompact(1200000000) → "Rp 1,2 M"
 */
export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')} jt`
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`
  }
  return formatRupiah(amount)
}

/**
 * Parse a Rupiah string back to a number.
 * parseRupiah("Rp 1.500.000") → 1500000
 * parseRupiah("1.500.000") → 1500000
 */
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[Rp\s.]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}
