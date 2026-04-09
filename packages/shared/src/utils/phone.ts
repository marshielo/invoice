/**
 * Normalize an Indonesian phone number to E.164 format (+62...).
 * formatIndonesianPhone("08123456789") → "+628123456789"
 * formatIndonesianPhone("628123456789") → "+628123456789"
 * formatIndonesianPhone("+628123456789") → "+628123456789"
 */
export function formatIndonesianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('62')) {
    return '+' + digits
  }
  if (digits.startsWith('0')) {
    return '+62' + digits.slice(1)
  }
  // Assume it's already local without leading 0
  return '+62' + digits
}

/**
 * Validate that a phone number is a valid Indonesian WhatsApp number.
 * Must be 10-13 digits after country code.
 */
export function validateWANumber(phone: string): boolean {
  const normalized = formatIndonesianPhone(phone)
  // +62 followed by 9-12 digits (total 12-15 chars)
  return /^\+62[1-9]\d{8,11}$/.test(normalized)
}

/**
 * Format a phone number for display (with dashes).
 * formatPhoneDisplay("+628123456789") → "+62 812-3456-789"
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = formatIndonesianPhone(phone)
  const local = normalized.replace('+62', '')

  if (local.length === 9) return `+62 ${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
  if (local.length === 10) return `+62 ${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`
  if (local.length === 11) return `+62 ${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`
  return normalized
}
