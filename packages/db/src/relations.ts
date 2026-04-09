import { relations as drizzleRelations } from 'drizzle-orm'
import { tenantBankAccounts, tenantQris, tenants } from './schema/tenants.js'
import { users } from './schema/users.js'

export const tenantsRelations = drizzleRelations(tenants, ({ many }) => ({
  users: many(users),
  bankAccounts: many(tenantBankAccounts),
  qrisCodes: many(tenantQris),
}))

export const usersRelations = drizzleRelations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}))

export const tenantBankAccountsRelations = drizzleRelations(tenantBankAccounts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantBankAccounts.tenantId],
    references: [tenants.id],
  }),
}))

export const tenantQrisRelations = drizzleRelations(tenantQris, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantQris.tenantId],
    references: [tenants.id],
  }),
}))

export const relations = {
  tenantsRelations,
  usersRelations,
  tenantBankAccountsRelations,
  tenantQrisRelations,
}
