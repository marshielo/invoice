/**
 * Format a date for display in Indonesian or English.
 * formatDate(new Date("2026-04-09"), "id") → "9 April 2026"
 * formatDate(new Date("2026-04-09"), "en") → "April 9, 2026"
 */
export function formatDate(date: Date | string, locale: 'id' | 'en' = 'id'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format a date as a short string.
 * formatDateShort(new Date("2026-04-09"), "id") → "09/04/2026"
 */
export function formatDateShort(date: Date | string, locale: 'id' | 'en' = 'id'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (locale === 'id') {
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

/**
 * Add days to a date and return a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Get the due date from an issue date + payment terms days.
 */
export function getDueDate(issueDate: Date, paymentTermsDays: number): Date {
  return addDays(issueDate, paymentTermsDays)
}

/**
 * Check if a date is in the past (overdue).
 */
export function isOverdue(dueDate: Date | string): boolean {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/**
 * Get the number of days until (positive) or since (negative) a date.
 */
export function daysFromNow(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Format a relative due date for display.
 * dueDateLabel(date, "id") → "Jatuh tempo 3 hari lagi" / "Jatuh tempo kemarin" / "Jatuh tempo hari ini"
 */
export function dueDateLabel(dueDate: Date | string, locale: 'id' | 'en' = 'id'): string {
  const days = daysFromNow(dueDate)

  if (locale === 'id') {
    if (days === 0) return 'Jatuh tempo hari ini'
    if (days === 1) return 'Jatuh tempo besok'
    if (days === -1) return 'Jatuh tempo kemarin'
    if (days > 1) return `Jatuh tempo ${days} hari lagi`
    return `Terlambat ${Math.abs(days)} hari`
  }

  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return 'Due yesterday'
  if (days > 1) return `Due in ${days} days`
  return `${Math.abs(days)} days overdue`
}
