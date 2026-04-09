# Application Structure

## Invoicein — Monorepo Directory Layout

**Date:** 2026-04-09

---

## Full Directory Structure

```
invoicein/
│
├── apps/
│   ├── web/                              # Next.js 15 — Cloudflare Pages
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── logo.svg
│   │   │   └── og-image.png
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── [locale]/              # next-intl locale routing
│   │   │   │   │   ├── (auth)/            # Auth pages (no sidebar)
│   │   │   │   │   │   ├── login/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── register/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── forgot-password/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── layout.tsx
│   │   │   │   │   ├── (dashboard)/       # Authenticated app (with sidebar)
│   │   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   │   └── page.tsx    # Main dashboard
│   │   │   │   │   │   ├── invoices/
│   │   │   │   │   │   │   ├── page.tsx    # Invoice list
│   │   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   │   └── page.tsx # Create invoice
│   │   │   │   │   │   │   └── [id]/
│   │   │   │   │   │   │       ├── page.tsx # Invoice detail
│   │   │   │   │   │   │       └── edit/
│   │   │   │   │   │   │           └── page.tsx
│   │   │   │   │   │   ├── quotations/
│   │   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   └── [id]/
│   │   │   │   │   │   │       └── page.tsx
│   │   │   │   │   │   ├── clients/
│   │   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   │   └── [id]/
│   │   │   │   │   │   │       └── page.tsx
│   │   │   │   │   │   ├── products/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── payments/
│   │   │   │   │   │   │   └── page.tsx    # Payment history
│   │   │   │   │   │   ├── expenses/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── reports/
│   │   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   │   ├── revenue/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   └── aging/
│   │   │   │   │   │   │       └── page.tsx
│   │   │   │   │   │   ├── settings/
│   │   │   │   │   │   │   ├── page.tsx    # General/business info
│   │   │   │   │   │   │   ├── bank-accounts/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   ├── invoice-settings/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   ├── team/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   ├── billing/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   └── notifications/
│   │   │   │   │   │   │       └── page.tsx
│   │   │   │   │   │   └── layout.tsx      # Dashboard layout with sidebar
│   │   │   │   │   ├── (public)/           # Public pages (no auth)
│   │   │   │   │   │   ├── i/
│   │   │   │   │   │   │   └── [token]/
│   │   │   │   │   │   │       └── page.tsx # Public invoice view
│   │   │   │   │   │   └── q/
│   │   │   │   │   │       └── [token]/
│   │   │   │   │   │           └── page.tsx # Public quotation view
│   │   │   │   │   ├── (marketing)/        # Landing pages
│   │   │   │   │   │   ├── page.tsx        # Homepage / landing
│   │   │   │   │   │   ├── pricing/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── features/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── layout.tsx
│   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   └── page.tsx        # Post-signup onboarding
│   │   │   │   │   └── layout.tsx          # Root locale layout
│   │   │   │   └── layout.tsx              # Root layout (providers)
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── sidebar.tsx
│   │   │   │   │   ├── header.tsx
│   │   │   │   │   ├── mobile-nav.tsx
│   │   │   │   │   └── user-menu.tsx
│   │   │   │   ├── invoices/
│   │   │   │   │   ├── invoice-form.tsx     # Main invoice form
│   │   │   │   │   ├── line-item-row.tsx    # Single line item
│   │   │   │   │   ├── invoice-totals.tsx   # Subtotal/tax/total display
│   │   │   │   │   ├── invoice-status-badge.tsx
│   │   │   │   │   ├── invoice-actions.tsx
│   │   │   │   │   └── invoice-table.tsx
│   │   │   │   ├── clients/
│   │   │   │   │   ├── client-form.tsx
│   │   │   │   │   ├── client-selector.tsx  # Combobox for selecting client
│   │   │   │   │   └── client-table.tsx
│   │   │   │   ├── products/
│   │   │   │   │   ├── product-form.tsx
│   │   │   │   │   ├── product-selector.tsx
│   │   │   │   │   └── product-table.tsx
│   │   │   │   ├── payments/
│   │   │   │   │   ├── payment-form.tsx
│   │   │   │   │   └── payment-list.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── stats-cards.tsx
│   │   │   │   │   ├── revenue-chart.tsx
│   │   │   │   │   ├── recent-invoices.tsx
│   │   │   │   │   └── ai-insights-card.tsx
│   │   │   │   ├── ai/
│   │   │   │   │   ├── chat-to-invoice.tsx
│   │   │   │   │   └── voice-input.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── data-table.tsx       # Reusable TanStack Table
│   │   │   │       ├── empty-state.tsx
│   │   │   │       ├── loading-skeleton.tsx
│   │   │   │       ├── confirm-dialog.tsx
│   │   │   │       ├── currency-input.tsx   # Rupiah formatted input
│   │   │   │       └── phone-input.tsx      # +62 formatted input
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   ├── use-tenant.ts
│   │   │   │   ├── use-invoices.ts          # TanStack Query hooks
│   │   │   │   ├── use-clients.ts
│   │   │   │   ├── use-products.ts
│   │   │   │   └── use-debounce.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts            # Typed fetch wrapper for Hono API
│   │   │   │   ├── supabase/
│   │   │   │   │   ├── client.ts            # Browser client
│   │   │   │   │   ├── server.ts            # Server client
│   │   │   │   │   └── middleware.ts         # Auth middleware for Next.js
│   │   │   │   ├── utils.ts                 # cn(), formatCurrency(), etc.
│   │   │   │   └── constants.ts
│   │   │   ├── i18n/
│   │   │   │   ├── config.ts
│   │   │   │   └── messages/
│   │   │   │       ├── id.json              # Bahasa Indonesia
│   │   │   │       └── en.json              # English
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api/                                 # Hono.js — Cloudflare Workers
│   │   ├── src/
│   │   │   ├── index.ts                     # Hono app entry point
│   │   │   ├── routes/
│   │   │   │   ├── index.ts                 # Route aggregator
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── tenant.routes.ts
│   │   │   │   ├── client.routes.ts
│   │   │   │   ├── product.routes.ts
│   │   │   │   ├── invoice.routes.ts
│   │   │   │   ├── quotation.routes.ts
│   │   │   │   ├── payment.routes.ts
│   │   │   │   ├── notification.routes.ts
│   │   │   │   ├── ai.routes.ts
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   ├── webhook.routes.ts        # Midtrans webhooks
│   │   │   │   └── public.routes.ts         # Public invoice/quotation view
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts        # JWT validation via Supabase
│   │   │   │   ├── tenant.middleware.ts      # Extract & validate tenant context
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   ├── error.middleware.ts       # Global error handler
│   │   │   │   └── logger.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── tenant.service.ts
│   │   │   │   ├── client.service.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── invoice.service.ts
│   │   │   │   ├── quotation.service.ts
│   │   │   │   ├── payment.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── pdf.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── whatsapp.service.ts
│   │   │   │   ├── midtrans.service.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   └── storage.service.ts       # R2 operations
│   │   │   ├── repositories/
│   │   │   │   ├── tenant.repository.ts
│   │   │   │   ├── client.repository.ts
│   │   │   │   ├── product.repository.ts
│   │   │   │   ├── invoice.repository.ts
│   │   │   │   ├── quotation.repository.ts
│   │   │   │   ├── payment.repository.ts
│   │   │   │   ├── notification.repository.ts
│   │   │   │   └── activity-log.repository.ts
│   │   │   ├── domain/
│   │   │   │   ├── invoice.domain.ts        # Business rules, calculations
│   │   │   │   ├── payment.domain.ts
│   │   │   │   └── subscription.domain.ts   # Plan limits, feature gates
│   │   │   ├── lib/
│   │   │   │   ├── db.ts                    # Drizzle client init
│   │   │   │   ├── supabase.ts              # Supabase admin client
│   │   │   │   └── env.ts                   # Environment variables with Zod validation
│   │   │   └── types/
│   │   │       └── context.ts               # Hono context types (auth user, tenant)
│   │   ├── wrangler.toml                    # Cloudflare Workers config
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                              # React Native (Expo) — Phase 3
│       ├── app/                             # Expo Router (file-based routing)
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   ├── (tabs)/
│       │   │   ├── index.tsx                # Dashboard
│       │   │   ├── invoices.tsx
│       │   │   ├── clients.tsx
│       │   │   └── settings.tsx
│       │   ├── invoices/
│       │   │   ├── new.tsx
│       │   │   └── [id].tsx
│       │   └── _layout.tsx
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── app.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── db/                                  # Drizzle ORM — Database layer
│   │   ├── src/
│   │   │   ├── index.ts                     # Export all schemas + client
│   │   │   ├── client.ts                    # Drizzle client factory
│   │   │   ├── schema/
│   │   │   │   ├── index.ts                 # Re-export all schemas
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── clients.ts
│   │   │   │   ├── products.ts
│   │   │   │   ├── invoices.ts
│   │   │   │   ├── invoice-lines.ts
│   │   │   │   ├── quotations.ts
│   │   │   │   ├── quotation-lines.ts
│   │   │   │   ├── payments.ts
│   │   │   │   ├── credit-notes.ts
│   │   │   │   ├── credit-note-lines.ts
│   │   │   │   ├── recurring-invoices.ts
│   │   │   │   ├── recurring-invoice-lines.ts
│   │   │   │   ├── expenses.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── activity-logs.ts
│   │   │   │   ├── ai-usage-logs.ts
│   │   │   │   ├── subscriptions.ts
│   │   │   │   └── subscription-invoices.ts
│   │   │   ├── relations.ts                 # Drizzle relations (joins)
│   │   │   └── seed.ts                      # Development seed data
│   │   ├── drizzle/
│   │   │   └── migrations/                  # SQL migration files
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── shared/                              # Shared types, validators, constants
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── schemas/                     # Zod schemas (API request/response)
│   │   │   │   ├── tenant.schema.ts
│   │   │   │   ├── client.schema.ts
│   │   │   │   ├── product.schema.ts
│   │   │   │   ├── invoice.schema.ts
│   │   │   │   ├── quotation.schema.ts
│   │   │   │   ├── payment.schema.ts
│   │   │   │   └── common.schema.ts         # Pagination, filters, etc.
│   │   │   ├── enums/
│   │   │   │   ├── invoice-status.ts
│   │   │   │   ├── quotation-status.ts
│   │   │   │   ├── payment-method.ts
│   │   │   │   ├── payment-status.ts
│   │   │   │   ├── user-role.ts
│   │   │   │   ├── notification-channel.ts
│   │   │   │   ├── subscription-plan.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts                 # Inferred types from Zod schemas
│   │   │   ├── constants/
│   │   │   │   ├── indonesia.ts             # Provinces, bank list, tax rates
│   │   │   │   ├── invoice.ts               # Default terms, numbering formats
│   │   │   │   └── plans.ts                 # Plan limits and pricing
│   │   │   └── utils/
│   │   │       ├── currency.ts              # formatRupiah(), parseCurrency()
│   │   │       ├── phone.ts                 # formatIndonesianPhone(), validateWA()
│   │   │       ├── tax.ts                   # calculatePPN(), taxRounding()
│   │   │       ├── invoice-number.ts        # generateInvoiceNumber()
│   │   │       └── date.ts                  # formatDate() with Indonesian locale
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                                  # Shared UI components (shadcn/ui based)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── combobox.tsx
│   │   │   │   └── ...                      # Other shadcn components
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── pdf/                                 # PDF generation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── templates/
│   │   │   │   ├── invoice-template.tsx      # Main invoice PDF template
│   │   │   │   ├── quotation-template.tsx
│   │   │   │   ├── credit-note-template.tsx
│   │   │   │   └── receipt-template.tsx
│   │   │   ├── components/
│   │   │   │   ├── header.tsx               # Tenant logo + info
│   │   │   │   ├── client-info.tsx
│   │   │   │   ├── line-items-table.tsx
│   │   │   │   ├── totals-section.tsx
│   │   │   │   ├── bank-details.tsx
│   │   │   │   ├── qris-code.tsx
│   │   │   │   └── footer.tsx
│   │   │   └── utils/
│   │   │       └── render.ts                # renderToBuffer(), renderToStream()
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── email/                               # Email templates (React Email)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── templates/
│   │   │   │   ├── invoice-sent.tsx
│   │   │   │   ├── payment-received.tsx
│   │   │   │   ├── payment-reminder.tsx
│   │   │   │   ├── quotation-sent.tsx
│   │   │   │   ├── welcome.tsx
│   │   │   │   └── team-invite.tsx
│   │   │   └── components/
│   │   │       ├── email-layout.tsx
│   │   │       └── email-button.tsx
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ai/                                  # AI prompt engineering + client
│       ├── src/
│       │   ├── index.ts
│       │   ├── client.ts                    # Anthropic SDK wrapper
│       │   ├── prompts/
│       │   │   ├── chat-to-invoice.ts       # System prompt for invoice parsing
│       │   │   ├── voice-to-invoice.ts
│       │   │   ├── insights.ts              # Business insights prompt
│       │   │   └── categorize.ts            # Product categorization
│       │   ├── parsers/
│       │   │   ├── invoice-parser.ts        # Parse LLM output → InvoiceCreateInput
│       │   │   └── insight-parser.ts
│       │   └── types.ts
│       ├── tsconfig.json
│       └── package.json
│
├── tooling/
│   ├── eslint/
│   │   └── base.js                          # Shared ESLint config
│   ├── typescript/
│   │   └── base.json                        # Shared TSConfig
│   └── tailwind/
│       └── base.ts                          # Shared Tailwind preset
│
├── .github/
│   └── workflows/
│       ├── ci.yml                           # Lint + Type-check + Test
│       └── deploy.yml                       # Deploy to Cloudflare
│
├── turbo.json                               # Turborepo pipeline config
├── pnpm-workspace.yaml
├── package.json                             # Root package.json
├── .env.example                             # Environment variables template
├── .gitignore
├── CLAUDE.md
└── docs/
    ├── 01-PRD.md
    ├── 02-TECH-STACK.md
    ├── 03-ERD.md
    ├── 04-EPICS-AND-TICKETS.md
    └── 05-APP-STRUCTURE.md
```

---

## Key Architectural Decisions

### 1. API Client Pattern (Web → API)

The web app communicates with the Hono API via a typed client:

```typescript
// apps/web/src/lib/api-client.ts
import { hc } from 'hono/client'
import type { AppType } from '@invoicein/api'

export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!)
```

This gives us **end-to-end type safety** — change an API response type, TypeScript immediately flags every consumer.

### 2. Package Dependency Graph

```
packages/shared ← (no deps, foundational)
    ↑
packages/db ← depends on shared (enums, types)
    ↑
packages/pdf ← depends on shared (types, formatters)
packages/email ← depends on shared (types, formatters)  
packages/ai ← depends on shared (types, schemas)
packages/ui ← standalone (only Tailwind + React)
    ↑
apps/api ← depends on db, shared, pdf, email, ai
apps/web ← depends on shared, ui
apps/mobile ← depends on shared
```

### 3. Environment Variables

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=invoicein-storage
R2_PUBLIC_URL=https://storage.invoicein.id

# External Services
RESEND_API_KEY=re_xxx
FONNTE_API_KEY=xxx
FONNTE_DEVICE_ID=xxx
MIDTRANS_SERVER_KEY=xxx
MIDTRANS_CLIENT_KEY=xxx
MIDTRANS_IS_PRODUCTION=false

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# App
NEXT_PUBLIC_API_URL=https://api.invoicein.id
NEXT_PUBLIC_APP_URL=https://app.invoicein.id
```
