export const InvoiceStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

export const QuotationStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
} as const
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus]

export const PaymentMethod = {
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  QRIS: 'qris',
  E_WALLET: 'e_wallet',
  CREDIT_CARD: 'credit_card',
  MIDTRANS: 'midtrans',
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const PaymentStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const UserRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
  VIEWER: 'viewer',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const NotificationChannel = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]

export const NotificationType = {
  INVOICE_SENT: 'invoice_sent',
  INVOICE_VIEWED: 'invoice_viewed',
  PAYMENT_REMINDER: 'payment_reminder',
  PAYMENT_RECEIVED: 'payment_received',
  QUOTATION_SENT: 'quotation_sent',
  QUOTATION_ACCEPTED: 'quotation_accepted',
  QUOTATION_REJECTED: 'quotation_rejected',
  WELCOME: 'welcome',
  TEAM_INVITE: 'team_invite',
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const SubscriptionPlan = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
} as const
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan]

export const BillingCycle = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const
export type BillingCycle = (typeof BillingCycle)[keyof typeof BillingCycle]

export const SubscriptionStatus = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const Frequency = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
} as const
export type Frequency = (typeof Frequency)[keyof typeof Frequency]

export const DiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType]

export const TaxCategory = {
  TAXABLE: 'taxable',
  NON_TAXABLE: 'non_taxable',
  EXEMPT: 'exempt',
} as const
export type TaxCategory = (typeof TaxCategory)[keyof typeof TaxCategory]

export const BusinessType = {
  FLORIST: 'florist',
  FREELANCER: 'freelancer',
  WORKSHOP: 'workshop',
  RETAIL: 'retail',
  FOOD_BEVERAGE: 'food_beverage',
  FASHION: 'fashion',
  SERVICE: 'service',
  OTHER: 'other',
} as const
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType]

export const AIFeature = {
  CHAT_TO_INVOICE: 'chat_to_invoice',
  VOICE_TO_INVOICE: 'voice_to_invoice',
  INSIGHTS: 'insights',
  CATEGORIZATION: 'categorization',
  SMART_REMINDER: 'smart_reminder',
} as const
export type AIFeature = (typeof AIFeature)[keyof typeof AIFeature]
