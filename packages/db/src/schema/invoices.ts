import { date, decimal, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { products } from './products'

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  issueDate: date('issue_date').notNull().defaultNow(),
  dueDate: date('due_date'),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).notNull().default('0'),
  amountPaid: decimal('amount_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  terms: text('terms'),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull().default('1'),
  unit: varchar('unit', { length: 50 }),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 30 }),
  paymentDate: date('payment_date').notNull(),
  referenceNumber: varchar('reference_number', { length: 100 }),
  proofUrl: varchar('proof_url', { length: 500 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type InvoiceItem = typeof invoiceItems.$inferSelect
export type NewInvoiceItem = typeof invoiceItems.$inferInsert
export type InvoicePayment = typeof invoicePayments.$inferSelect
export type NewInvoicePayment = typeof invoicePayments.$inferInsert
