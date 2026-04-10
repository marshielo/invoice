import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/config.ts')

const nextConfig: NextConfig = {
  transpilePackages: ['@invoicein/shared'],
  experimental: {
    optimizePackageImports: ['@invoicein/ui', 'lucide-react'],
  },
  webpack: (config) => {
    // Allow webpack to resolve TypeScript files imported with .js extension (ESM convention)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.invoicein.id',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
