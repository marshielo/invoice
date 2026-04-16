// Shared API response types matching the Go backend DTOs

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface BankAccount {
  id: string
  bankName: string
  bankCode: string | null
  accountNumber: string
  accountHolderName: string
  isPrimary: boolean
  isActive: boolean
}

export interface QRISData {
  id: string
  imageUrl: string
  nmid: string | null
  isActive: boolean
}

export interface SettingsData {
  id: string
  slug: string
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  npwp: string | null
  businessType: string
  logoUrl: string | null
  subscriptionPlan: string
  subscriptionExpiresAt: string | null
  invoicePrefix: string
  invoiceFormat: string
  quotationPrefix: string
  creditNotePrefix: string
  defaultCurrency: string
  defaultPaymentTermsDays: number
  defaultNotes: string | null
  defaultTerms: string | null
  ppnEnabled: boolean
  ppnRate: string
  bankAccounts: BankAccount[]
  qris: QRISData | null
  createdAt: string
  updatedAt: string
}

export interface UserData {
  id: string
  email: string
  fullName: string | null
  role: string
  isActive: boolean
  createdAt: string
}

export interface UsersListData {
  users: UserData[]
  total: number
  limit: number
  offset: number
}
