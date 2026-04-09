# Technical Architecture & Stack Decision

## Invoicein — Tech Stack Document

**Date:** 2026-04-09

---

## 1. Architecture Overview

**Monorepo with Layered Architecture** — clean separation of concerns, shared types, independently deployable services.

```
invoicein/
├── apps/
│   ├── web/                 # Next.js 15 (App Router) — Cloudflare Pages
│   ├── api/                 # Hono.js — Cloudflare Workers
│   └── mobile/              # React Native (Expo) — iOS
├── packages/
│   ├── db/                  # Drizzle ORM schemas, migrations, seed
│   ├── shared/              # Zod validators, types, constants, enums
│   ├── ui/                  # Shared React component library
│   ├── pdf/                 # Invoice PDF generation (React-PDF)
│   ├── email/               # Email templates (React Email)
│   └── ai/                  # AI prompt templates, LLM client wrappers
├── tooling/
│   ├── eslint/              # Shared ESLint config
│   ├── typescript/          # Shared TSConfig
│   └── tailwind/            # Shared Tailwind config
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## 2. Stack Decision Matrix

### Why These Choices?

| Layer | Choice | Why (over alternatives) |
|-------|--------|------------------------|
| **Monorepo** | Turborepo + pnpm | Fastest build caching, first-class pnpm support, proven at scale |
| **Frontend** | Next.js 15 (App Router) | Best React meta-framework, SSR/SSG for SEO (landing/public invoice pages), RSC for performance, massive ecosystem |
| **Backend API** | Hono.js | Ultra-lightweight (14KB), native Cloudflare Workers support, Express-like DX, TypeScript-first, middleware ecosystem. **Why not Next.js API routes?** Separating the API enables: independent scaling, shared API for web+mobile, cleaner layered architecture, no cold-start coupling |
| **Database** | Supabase (PostgreSQL 15) | Managed Postgres, built-in RLS, real-time subscriptions, generous free tier, great DX, Edge Functions if needed |
| **ORM** | Drizzle ORM | Edge-compatible (works on Cloudflare Workers unlike Prisma), SQL-like syntax, zero overhead, excellent TypeScript inference, supports Supabase/Postgres natively |
| **Auth** | Supabase Auth | Free, supports email/password + Google OAuth + magic link, JWT-based, integrates with RLS, mobile SDK available |
| **Validation** | Zod | Runtime + compile-time validation, integrates with Drizzle (drizzle-zod), tRPC, React Hook Form |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first, consistent design, shadcn gives headless accessible components, easy to theme per-tenant |
| **Mobile** | React Native (Expo) | Code sharing with web (shared packages), Expo for rapid iOS development, OTA updates, EAS for builds |
| **PDF** | @react-pdf/renderer | React component-based PDF generation, runs server-side, beautiful output, full control over layout |
| **Email** | React Email + Resend | React components for emails (consistent with our stack), Resend has great deliverability + DX |
| **WhatsApp** | Fonnte API | Indonesian WA API provider, affordable (starts ~Rp 50K/month), supports send message + media + template. Upgrade path to official WA Business API later |
| **Payment** | Midtrans (Snap) | Indonesian market leader, supports VA (all banks), GoPay, ShopeePay, QRIS, credit cards. Snap for easy checkout UI |
| **AI** | Anthropic Claude API | Best for structured output (invoice parsing), excellent Indonesian language support, cost-effective with Haiku for simple tasks |
| **Deployment** | Cloudflare (Pages + Workers) | Edge-first (fast in Indonesia), generous free tier, Workers for API, Pages for Next.js, R2 for storage, Queues for background jobs |
| **Storage** | Cloudflare R2 | S3-compatible, zero egress fees, perfect for invoice PDFs and receipt images |
| **Background Jobs** | Cloudflare Queues + Cron Triggers | Native to Workers, handles: PDF generation, email sending, WA sending, recurring invoice creation |
| **State Management** | TanStack Query (React Query) | Server state management, caching, optimistic updates, works with any API layer |
| **Forms** | React Hook Form + Zod | Best performance for complex forms (invoice line items), Zod integration for validation |
| **i18n** | next-intl | Lightweight, App Router compatible, ICU message format, plural/currency formatting |
| **Testing** | Vitest + Playwright | Vitest for unit/integration (fast, ESM-native), Playwright for E2E |
| **Analytics** | PostHog (self-hostable) | Product analytics, feature flags, session recording, GDPR-compliant, generous free tier |

---

## 3. API Architecture — Layered Design

```
┌────────────────────────────────────────────┐
│              Hono.js Router                │  ← Routes/Controllers
│   /api/v1/invoices, /api/v1/clients, ...   │
├────────────────────────────────────────────┤
│            Middleware Layer                 │  ← Auth, tenant resolution, rate limiting, validation
│   authMiddleware, tenantMiddleware, zod     │
├────────────────────────────────────────────┤
│            Service Layer                   │  ← Business logic
│   InvoiceService, ClientService, etc.      │
├────────────────────────────────────────────┤
│           Repository Layer                 │  ← Data access (Drizzle ORM)
│   InvoiceRepository, ClientRepository      │
├────────────────────────────────────────────┤
│            Domain Layer                    │  ← Entities, Value Objects, Enums
│   Invoice, LineItem, Money, InvoiceStatus  │
├────────────────────────────────────────────┤
│          Infrastructure Layer              │  ← External services
│   Supabase, Midtrans, Fonnte, Resend, R2  │
└────────────────────────────────────────────┘
```

### API Design: REST with OpenAPI

We use **REST API** (not tRPC) because:
1. Mobile app (React Native) needs it — tRPC is web-only practically
2. Future public API for third-party integrations
3. OpenAPI spec auto-generates client SDKs
4. Hono has excellent OpenAPI/Zod integration via `@hono/zod-openapi`

```
GET    /api/v1/invoices           → List invoices (paginated, filtered)
POST   /api/v1/invoices           → Create invoice
GET    /api/v1/invoices/:id       → Get invoice detail
PATCH  /api/v1/invoices/:id       → Update invoice
DELETE /api/v1/invoices/:id       → Soft-delete invoice
POST   /api/v1/invoices/:id/send  → Send invoice (email/WA)
POST   /api/v1/invoices/:id/pdf   → Generate/regenerate PDF
POST   /api/v1/invoices/:id/pay   → Record manual payment

POST   /api/v1/ai/chat-to-invoice → Natural language → invoice
POST   /api/v1/ai/voice-to-invoice → Audio file → invoice

... (full API spec in separate doc)
```

---

## 4. PWA vs Native — Explanation

Since you asked:

| Aspect | PWA (Progressive Web App) | Native (React Native/Expo) |
|--------|--------------------------|---------------------------|
| **What is it?** | A website that behaves like an app — installable from browser, works offline, push notifications | A real app compiled for iOS, distributed via App Store |
| **Installation** | User adds to home screen from Safari/Chrome. No app store needed. | Downloaded from App Store. Requires Apple Developer account ($99/year). |
| **Performance** | Good, but limited by browser engine. Complex animations can lag. | Excellent. Uses native UI components. |
| **Offline** | Service workers cache pages/data. Limited offline capability. | Full offline support with local DB (SQLite). |
| **Push Notifications** | Supported on iOS since iOS 16.4, but limited. | Full push notification support. |
| **Camera/Files** | Basic access via browser APIs. | Full access to camera, file system, biometrics. |
| **App Store Presence** | No App Store listing. Less discoverable. | Listed on App Store. Social proof. |
| **Cost** | Free to deploy (just your web hosting). | Apple Developer $99/year + build infra. |
| **Updates** | Instant — just deploy the website. | Expo OTA for JS updates, full builds for native changes. |

### Our Strategy:
1. **Phase 1:** Responsive web (works great on mobile Safari) = essentially a PWA
2. **Phase 3:** React Native (Expo) iOS app for power users + App Store presence
3. **Shared packages** (db, shared, ui primitives) work across both

---

## 5. Infrastructure Diagram

```
                    ┌──────────────┐
                    │   Cloudflare  │
                    │     DNS       │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──┐  ┌─────▼──────┐  ┌──▼─────────┐
    │ Cloudflare  │  │ Cloudflare  │  │ Cloudflare  │
    │   Pages     │  │  Workers    │  │    R2       │
    │  (Next.js)  │  │  (Hono API) │  │  (Storage)  │
    │  Frontend   │  │  Backend    │  │  PDFs/media │
    └─────────────┘  └──────┬──────┘  └─────────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
    ┌─────────▼──┐  ┌──────▼─────┐  ┌─────▼──────┐
    │  Supabase   │  │  Supabase  │  │ Cloudflare │
    │  PostgreSQL │  │    Auth    │  │   Queues   │
    │  (Database) │  │  (JWT/RLS) │  │ (Bg Jobs)  │
    └─────────────┘  └────────────┘  └─────┬──────┘
                                           │
                            ┌──────────────┼──────────────┐
                            │              │              │
                   ┌────────▼──┐  ┌────────▼──┐  ┌───────▼───┐
                   │   Resend   │  │  Fonnte   │  │  Midtrans │
                   │  (Email)   │  │   (WA)    │  │ (Payment) │
                   └────────────┘  └───────────┘  └───────────┘
```

---

## 6. Security Architecture

### Multi-Tenancy Strategy: Schema-per-Feature with Row-Level Security

Every table includes a `tenant_id` column. Supabase RLS policies ensure:
- Users can only read/write their own tenant's data
- API middleware validates tenant context on every request
- No cross-tenant data leakage possible

```sql
-- Example RLS policy
CREATE POLICY "Tenant isolation" ON invoices
  USING (tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id');
```

### Auth Flow:
1. User signs up → Supabase Auth creates user
2. User creates/joins a tenant → `tenant_id` stored in JWT `app_metadata`
3. Every API request: Hono middleware extracts JWT → validates → sets tenant context
4. Drizzle queries always filter by `tenant_id` (defense in depth)
5. RLS as the last line of defense at DB level

### Data Encryption:
- PII (bank account numbers, NPWP) encrypted at application level (AES-256)
- All traffic over HTTPS (Cloudflare handles TLS)
- Supabase encrypts data at rest

---

## 7. Performance Strategy

| Strategy | Implementation |
|----------|---------------|
| **Edge caching** | Cloudflare CDN for static assets, Workers KV for hot data |
| **Database** | Connection pooling via Supabase (PgBouncer), proper indexing |
| **PDF generation** | Async via Queues — user doesn't wait, gets notified when ready |
| **API response** | Paginated by default, cursor-based for large datasets |
| **Frontend** | React Server Components, streaming, lazy loading |
| **Images** | Cloudflare Image Resizing, WebP format, lazy loading |
| **Bundle** | Tree-shaking, code splitting per route, Turbopack in dev |
