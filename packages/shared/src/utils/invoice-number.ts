import { INVOICE_SEQ_PADDING } from '../constants/index.js'

/**
 * Generate an invoice number from a format template.
 *
 * Supported tokens:
 *   {PREFIX} → the user-configured prefix (e.g. "INV")
 *   {YYYY}   → 4-digit year (e.g. "2026")
 *   {YY}     → 2-digit year (e.g. "26")
 *   {MM}     → zero-padded month (e.g. "04")
 *   {SEQ}    → zero-padded sequence number
 *
 * Example:
 *   generateInvoiceNumber("{PREFIX}/{YYYY}/{MM}/{SEQ}", "INV", 42, new Date("2026-04-09"))
 *   → "INV/2026/04/0042"
 */
export function generateInvoiceNumber(
  format: string,
  prefix: string,
  seq: number,
  date: Date = new Date(),
  padding: number = INVOICE_SEQ_PADDING,
): string {
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const seqStr = seq.toString().padStart(padding, '0')

  return format
    .replace('{PREFIX}', prefix)
    .replace('{YYYY}', year)
    .replace('{YY}', year.slice(2))
    .replace('{MM}', month)
    .replace('{SEQ}', seqStr)
}

/**
 * Extract the next sequence number from an existing invoice number.
 * Useful for display/preview in settings.
 */
export function previewInvoiceNumber(
  format: string,
  prefix: string,
  currentSeq: number,
  date: Date = new Date(),
): string {
  return generateInvoiceNumber(format, prefix, currentSeq + 1, date)
}
