import { eq } from 'drizzle-orm'
import { tenantBankAccounts, tenants, users } from '@invoicein/db/schema'
import type { Database } from '@invoicein/db'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConflictError, NotFoundError } from '~/lib/errors'

export interface CreateTenantInput {
  name: string
  slug: string
  businessType: string
  email: string
  phone?: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
  // Creator (Supabase Auth user)
  creatorId: string
  creatorEmail: string
  creatorFullName: string
}

export interface TenantWithUser {
  tenant: typeof tenants.$inferSelect
  user: typeof users.$inferSelect
}

/**
 * Creates a new tenant and the owning user record in a single transaction.
 * Also updates the Supabase JWT app_metadata so the new tenant_id is
 * immediately reflected in subsequent token validations.
 */
export async function createTenant(
  db: Database,
  supabase: SupabaseClient,
  input: CreateTenantInput,
): Promise<TenantWithUser> {
  // 1. Check slug uniqueness
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, input.slug),
  })
  if (existing) {
    throw new ConflictError(`Slug "${input.slug}" sudah digunakan oleh tenant lain`)
  }

  // 2. Create tenant + user in a transaction
  let newTenant: typeof tenants.$inferSelect
  let newUser: typeof users.$inferSelect

  await db.transaction(async (tx) => {
    // Insert tenant
    const [insertedTenant] = await tx
      .insert(tenants)
      .values({
        name: input.name,
        slug: input.slug,
        email: input.email,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.province !== undefined ? { province: input.province } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        businessType: input.businessType as typeof tenants.$inferInsert['businessType'],
      })
      .returning()

    if (!insertedTenant) throw new Error('Gagal membuat tenant')
    newTenant = insertedTenant

    // Insert user as owner
    const [insertedUser] = await tx
      .insert(users)
      .values({
        id: input.creatorId,
        tenantId: insertedTenant.id,
        email: input.creatorEmail,
        fullName: input.creatorFullName,
        role: 'owner',
      })
      .returning()

    if (!insertedUser) throw new Error('Gagal membuat user')
    newUser = insertedUser
  })

  // 3. Update Supabase JWT app_metadata so next token has tenant context
  await supabase.auth.admin.updateUserById(input.creatorId, {
    app_metadata: {
      tenant_id: newTenant!.id,
      tenant_slug: newTenant!.slug,
      role: 'owner',
    },
  })

  return { tenant: newTenant!, user: newUser! }
}

/**
 * Returns the tenant for the given user ID.
 * Throws NotFoundError if the user has no tenant record.
 */
export async function getTenantByUserId(
  db: Database,
  userId: string,
): Promise<typeof tenants.$inferSelect & { bankAccounts: (typeof tenantBankAccounts.$inferSelect)[] }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      tenant: {
        with: {
          bankAccounts: {
            where: eq(tenantBankAccounts.isActive, true),
          },
        },
      },
    },
  })

  if (!user) {
    throw new NotFoundError('User')
  }
  if (!user.tenant) {
    throw new NotFoundError('Tenant')
  }

  return user.tenant
}
