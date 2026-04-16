import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  npwp: varchar('npwp', { length: 30 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
