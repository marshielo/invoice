import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { SlugSchema, PhoneSchema } from '@invoicein/shared/schemas'
import { BusinessType } from '@invoicein/shared/enums'
import { getDb } from '~/lib/db'
import { getSupabaseAdmin } from '~/lib/supabase'
import { authMiddleware } from '~/middleware/auth.middleware'
import { tenantMiddleware } from '~/middleware/tenant.middleware'
import { createTenant, getTenantByUserId } from '~/services/tenants.service'
import type { AppEnv } from '~/types/context'

export const tenantRoutes = new Hono<AppEnv>()

// All tenant routes require auth
tenantRoutes.use('*', authMiddleware)

/**
 * POST /api/v1/tenants
 * Creates a new tenant. Only allowed for users who don't have a tenant yet.
 * After creation, the Supabase JWT app_metadata is updated so subsequent
 * requests through tenantMiddleware will resolve the new tenant correctly.
 */
tenantRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(255),
      slug: SlugSchema,
      businessType: z.nativeEnum(BusinessType),
      email: z.string().email('Format email tidak valid'),
      phone: PhoneSchema.optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      province: z.string().max(100).optional(),
      postalCode: z.string().max(10).optional(),
      fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(255),
    }),
  ),
  async (c) => {
    const userId = c.get('userId')
    const userEmail = c.get('userEmail')
    const body = c.req.valid('json')
    const db = getDb(c)
    const supabase = getSupabaseAdmin(c)

    const { tenant, user } = await createTenant(db, supabase, {
      name: body.name,
      slug: body.slug,
      businessType: body.businessType,
      email: body.email,
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.province !== undefined ? { province: body.province } : {}),
      ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
      creatorId: userId,
      creatorEmail: userEmail,
      creatorFullName: body.fullName,
    })

    return c.json(
      {
        success: true as const,
        data: {
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone ?? null,
            businessType: tenant.businessType,
            subscriptionPlan: tenant.subscriptionPlan,
            createdAt: tenant.createdAt,
          },
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        },
      },
      201,
    )
  },
)

/**
 * GET /api/v1/tenants/me
 * Returns the current user's tenant with bank accounts.
 * Returns 404 if the user hasn't created a tenant yet.
 */
tenantRoutes.get('/me', tenantMiddleware, async (c) => {
  const userId = c.get('userId')
  const db = getDb(c)

  const tenant = await getTenantByUserId(db, userId)

  return c.json({
    success: true as const,
    data: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? null,
      address: tenant.address ?? null,
      city: tenant.city ?? null,
      province: tenant.province ?? null,
      postalCode: tenant.postalCode ?? null,
      npwp: tenant.npwp ?? null,
      businessType: tenant.businessType,
      logoUrl: tenant.logoUrl ?? null,
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt ?? null,
      invoicePrefix: tenant.invoicePrefix,
      invoiceFormat: tenant.invoiceFormat,
      quotationPrefix: tenant.quotationPrefix,
      defaultCurrency: tenant.defaultCurrency,
      defaultPaymentTermsDays: tenant.defaultPaymentTermsDays,
      defaultNotes: tenant.defaultNotes ?? null,
      defaultTerms: tenant.defaultTerms ?? null,
      ppnEnabled: tenant.ppnEnabled,
      ppnRate: tenant.ppnRate,
      branding: tenant.branding ?? null,
      bankAccounts: tenant.bankAccounts.map((ba) => ({
        id: ba.id,
        bankName: ba.bankName,
        bankCode: ba.bankCode ?? null,
        accountNumber: ba.accountNumber,
        accountHolderName: ba.accountHolderName,
        isPrimary: ba.isPrimary,
      })),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    },
  })
})
