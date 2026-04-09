/**
 * Development seed script.
 * Run with: pnpm --filter @invoicein/db db:seed
 *
 * Creates a sample tenant + owner user for local development.
 */
import { createDb } from './client.js'

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

const db = createDb(DATABASE_URL)

async function seed() {
  console.log('🌱 Seeding development database...')

  // Upsert demo tenant
  const [tenant] = await db
    .insert((await import('./schema/tenants.js')).tenants)
    .values({
      slug: 'ratna-florist',
      name: 'Ratna Florist',
      email: 'ratna@example.com',
      phone: '08123456789',
      address: 'Jl. Mawar No. 1',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      invoicePrefix: 'INV',
      invoiceFormat: '{PREFIX}/{YYYY}/{MM}/{SEQ}',
    })
    .onConflictDoNothing()
    .returning()

  if (tenant) {
    console.log(`✅ Tenant created: ${tenant.name} (${tenant.slug})`)
  } else {
    console.log('ℹ️  Tenant already exists, skipping')
  }

  console.log('✅ Seed complete')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
