import { defineConfig } from 'drizzle-kit'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

export default defineConfig({
  // List schema files directly — drizzle-kit uses CJS require() which can't
  // resolve bundler-style .js → .ts aliases used in barrel index.ts.
  // Add new schema files here as they are created.
  schema: [
    './src/schema/tenants.ts',
    './src/schema/users.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
})
