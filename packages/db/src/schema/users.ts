import { boolean, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from './tenants.js'

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'staff', 'viewer'])

export const users = pgTable('users', {
  // Matches Supabase Auth uid exactly
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  role: userRoleEnum('role').notNull().default('staff'),
  locale: varchar('locale', { length: 5 }).notNull().default('id'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
