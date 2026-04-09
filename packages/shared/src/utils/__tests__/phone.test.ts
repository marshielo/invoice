import { describe, expect, it } from 'vitest'
import { formatIndonesianPhone, validateWANumber } from '../phone.js'

describe('formatIndonesianPhone', () => {
  it('converts leading 0 to +62', () =>
    expect(formatIndonesianPhone('08123456789')).toBe('+628123456789'))
  it('converts 62 prefix to +62', () =>
    expect(formatIndonesianPhone('628123456789')).toBe('+628123456789'))
  it('passes through +62 prefix', () =>
    expect(formatIndonesianPhone('+628123456789')).toBe('+628123456789'))
  it('handles spaces and dashes', () =>
    expect(formatIndonesianPhone('0812 3456 789')).toBe('+628123456789'))
})

describe('validateWANumber', () => {
  it('accepts valid Indonesian mobile number', () =>
    expect(validateWANumber('08123456789')).toBe(true))
  it('accepts +62 format', () => expect(validateWANumber('+628123456789')).toBe(true))
  it('rejects too-short number', () => expect(validateWANumber('0812')).toBe(false))
  it('rejects number starting with 0 after country code', () =>
    expect(validateWANumber('+620123456789')).toBe(false))
})
