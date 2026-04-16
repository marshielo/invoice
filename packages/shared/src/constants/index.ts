import { SubscriptionPlan } from '../enums/index'

// -------------------------------------------------------
// Indonesian Banks
// -------------------------------------------------------
export const INDONESIAN_BANKS = [
  { code: 'bca', name: 'BCA (Bank Central Asia)' },
  { code: 'mandiri', name: 'Bank Mandiri' },
  { code: 'bri', name: 'BRI (Bank Rakyat Indonesia)' },
  { code: 'bni', name: 'BNI (Bank Negara Indonesia)' },
  { code: 'bsi', name: 'BSI (Bank Syariah Indonesia)' },
  { code: 'cimb', name: 'CIMB Niaga' },
  { code: 'danamon', name: 'Bank Danamon' },
  { code: 'permata', name: 'Bank Permata' },
  { code: 'maybank', name: 'Maybank Indonesia' },
  { code: 'ocbc', name: 'OCBC NISP' },
  { code: 'panin', name: 'Bank Panin' },
  { code: 'btn', name: 'BTN (Bank Tabungan Negara)' },
  { code: 'bjb', name: 'Bank BJB' },
  { code: 'dki', name: 'Bank DKI' },
  { code: 'neo', name: 'Bank Neo Commerce' },
  { code: 'jago', name: 'Bank Jago' },
  { code: 'blu', name: 'blu by BCA Digital' },
  { code: 'seabank', name: 'SeaBank' },
  { code: 'other', name: 'Bank Lainnya' },
] as const

export type IndonesianBankCode = (typeof INDONESIAN_BANKS)[number]['code']

// -------------------------------------------------------
// Indonesian Provinces (38 provinces as of 2024)
// -------------------------------------------------------
export const INDONESIAN_PROVINCES = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Jawa Barat',
  'Banten',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Selatan',
  'Papua Barat Daya',
] as const

export type IndonesianProvince = (typeof INDONESIAN_PROVINCES)[number]

// -------------------------------------------------------
// Tax
// -------------------------------------------------------
export const PPN_RATE = 0.11 // 11% PPN as of April 2022

// -------------------------------------------------------
// Invoice Number Formats
// -------------------------------------------------------
export const INVOICE_NUMBER_FORMATS = [
  { id: 'prefix_year_month_seq', label: 'INV/2026/04/001', format: '{PREFIX}/{YYYY}/{MM}/{SEQ}' },
  { id: 'prefix_year_seq', label: 'INV/2026/001', format: '{PREFIX}/{YYYY}/{SEQ}' },
  { id: 'prefix_seq', label: 'INV-001', format: '{PREFIX}-{SEQ}' },
  { id: 'year_month_seq', label: '2026/04/001', format: '{YYYY}/{MM}/{SEQ}' },
] as const

export const DEFAULT_INVOICE_PREFIX = 'INV'
export const DEFAULT_QUOTATION_PREFIX = 'QUO'
export const DEFAULT_CREDIT_NOTE_PREFIX = 'CN'

// -------------------------------------------------------
// Payment Terms
// -------------------------------------------------------
export const PAYMENT_TERMS_OPTIONS = [
  { days: 0, label: 'Bayar segera (COD)' },
  { days: 7, label: 'Net 7 hari' },
  { days: 14, label: 'Net 14 hari' },
  { days: 30, label: 'Net 30 hari' },
  { days: 45, label: 'Net 45 hari' },
  { days: 60, label: 'Net 60 hari' },
] as const

// -------------------------------------------------------
// Plan Limits
// -------------------------------------------------------
export const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: {
    invoicesPerMonth: 10,
    maxUsers: 1,
    maxClients: 25,
    maxProducts: 20,
    aiPromptsPerMonth: 0,
    customBranding: false,
    whatsappIntegration: false,
    clientPortal: false,
    recurringInvoices: false,
    apiAccess: false,
  },
  [SubscriptionPlan.PROFESSIONAL]: {
    invoicesPerMonth: Infinity,
    maxUsers: 5,
    maxClients: Infinity,
    maxProducts: Infinity,
    aiPromptsPerMonth: 50,
    customBranding: true,
    whatsappIntegration: true,
    clientPortal: false,
    recurringInvoices: true,
    apiAccess: false,
  },
  [SubscriptionPlan.BUSINESS]: {
    invoicesPerMonth: Infinity,
    maxUsers: Infinity,
    maxClients: Infinity,
    maxProducts: Infinity,
    aiPromptsPerMonth: Infinity,
    customBranding: true,
    whatsappIntegration: true,
    clientPortal: true,
    recurringInvoices: true,
    apiAccess: true,
  },
} as const

// -------------------------------------------------------
// Pricing (IDR)
// -------------------------------------------------------
export const PLAN_PRICING = {
  [SubscriptionPlan.FREE]: { monthly: 0, yearly: 0 },
  [SubscriptionPlan.PROFESSIONAL]: { monthly: 99_000, yearly: 999_000 },
  [SubscriptionPlan.BUSINESS]: { monthly: 249_000, yearly: 2_499_000 },
} as const

// -------------------------------------------------------
// Default Invoice Notes / Terms
// -------------------------------------------------------
export const DEFAULT_INVOICE_NOTES =
  'Terima kasih atas kepercayaan Anda. Mohon lakukan pembayaran sebelum tanggal jatuh tempo.'

export const DEFAULT_INVOICE_TERMS =
  'Pembayaran dilakukan melalui transfer bank ke rekening yang tertera. ' +
  'Barang yang sudah dibeli tidak dapat dikembalikan kecuali terdapat cacat produksi.'

// -------------------------------------------------------
// Sequence padding
// -------------------------------------------------------
export const INVOICE_SEQ_PADDING = 4 // INV/2026/04/0001
