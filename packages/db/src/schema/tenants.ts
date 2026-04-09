import { boolean, decimal, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'free',
  'professional',
  'business',
])

export const businessTypeEnum = pgEnum('business_type', [
  'florist',
  'freelancer',
  'workshop',
  'retail',
  'food_beverage',
  'fashion',
  'service',
  'other',
])

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 63 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  npwp: varchar('npwp', { length: 30 }), // encrypted at app layer
  businessType: businessTypeEnum('business_type').default('other'),
  logoUrl: varchar('logo_url', { length: 500 }),

  // Subscription
  subscriptionPlan: subscriptionPlanEnum('subscription_plan').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),

  // Invoice settings
  invoicePrefix: varchar('invoice_prefix', { length: 20 }).notNull().default('INV'),
  invoiceFormat: varchar('invoice_format', { length: 50 })
    .notNull()
    .default('{PREFIX}/{YYYY}/{MM}/{SEQ}'),
  invoiceSequenceCounter: integer('invoice_sequence_counter').notNull().default(0),
  quotationPrefix: varchar('quotation_prefix', { length: 20 }).notNull().default('QUO'),
  quotationSequenceCounter: integer('quotation_sequence_counter').notNull().default(0),
  creditNotePrefix: varchar('credit_note_prefix', { length: 20 }).notNull().default('CN'),
  creditNoteSequenceCounter: integer('credit_note_sequence_counter').notNull().default(0),

  // Defaults
  defaultCurrency: varchar('default_currency', { length: 3 }).notNull().default('IDR'),
  defaultPaymentTermsDays: integer('default_payment_terms_days').notNull().default(14),
  defaultNotes: text('default_notes'),
  defaultTerms: text('default_terms'),

  // Tax
  ppnEnabled: boolean('ppn_enabled').notNull().default(true),
  ppnRate: decimal('ppn_rate', { precision: 5, scale: 2 }).notNull().default('11.00'),

  // Branding
  branding: jsonb('branding').$type<{
    primaryColor?: string
    fontFamily?: string
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

// -------------------------------------------------------

export const tenantBankAccounts = pgTable('tenant_bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  accountNumber: varchar('account_number', { length: 100 }).notNull(), // encrypted
  accountHolderName: varchar('account_holder_name', { length: 255 }).notNull(),
  bankCode: varchar('bank_code', { length: 20 }),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TenantBankAccount = typeof tenantBankAccounts.$inferSelect
export type NewTenantBankAccount = typeof tenantBankAccounts.$inferInsert

// -------------------------------------------------------

export const tenantQris = pgTable('tenant_qris', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  qrisImageUrl: varchar('qris_image_url', { length: 500 }).notNull(),
  qrisNmid: varchar('qris_nmid', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TenantQris = typeof tenantQris.$inferSelect
export type NewTenantQris = typeof tenantQris.$inferInsert
