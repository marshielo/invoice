# Epics & Ticket Breakdown

## Invoicein — Implementation Plan

**Date:** 2026-04-09

---

## Epic Overview & Dependency Graph

```
E1: Foundation & Infrastructure
 └── E2: Auth & Tenant System
      ├── E3: Client & Product Management (parallel)
      ├── E4: Invoice Core (parallel after E3)
      │    └── E5: Quotation System (after E4)
      │    └── E6: Payment System (after E4)
      │         └── E7: Midtrans Integration (after E6)
      ├── E8: PDF Generation (parallel after E4)
      ├── E9: Notifications — Email & WhatsApp (parallel after E4)
      │    └── E10: Payment Reminders (after E6 + E9)
      └── E11: Dashboard & Reports (after E4 + E6)
           └── E12: AI Features (after E4)
                └── E13: Recurring Invoices (after E4 + E6)
                     └── E14: Credit Notes (after E4 + E6)
                          └── E15: SaaS Billing & Subscription (after E2)
                               └── E16: Client Portal (after E4 + E6 + E8)
                                    └── E17: Mobile App (after all API work)
```

---

## E1: Foundation & Infrastructure

> Set up monorepo, tooling, database, deployment pipeline.

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E1-001 | Monorepo Setup | Initialize Turborepo + pnpm workspace. Create `apps/web`, `apps/api`, `packages/db`, `packages/shared`, `packages/ui`. Configure TypeScript, ESLint, Prettier, path aliases. | 4h |
| E1-002 | Database Package | Set up `packages/db` with Drizzle ORM, Supabase connection, migration system. Create initial migration with `tenants`, `users` tables. | 3h |
| E1-003 | API App Scaffold | Set up `apps/api` with Hono.js, Cloudflare Workers config, middleware skeleton (auth, tenant, error handling, CORS, logging). Health check endpoint. | 3h |
| E1-004 | Web App Scaffold | Set up `apps/web` with Next.js 15 (App Router), Tailwind v4, shadcn/ui, next-intl (id/en), layout structure, landing page skeleton. | 3h |
| E1-005 | CI/CD Pipeline | GitHub Actions: lint, type-check, test, build. Cloudflare Pages deploy for web, Cloudflare Workers deploy for API. Preview deployments on PR. | 3h |
| E1-006 | Shared Package | Set up `packages/shared` with Zod schemas, shared types/enums, constants (invoice statuses, roles, payment methods). | 2h |
| E1-007 | R2 Storage Setup | Configure Cloudflare R2 bucket for PDF/media storage. Create upload utility in API with signed URL generation. | 2h |

**Total: ~20h**

---

## E2: Auth & Tenant System

> User registration, login, tenant creation, team management.

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E2-001 | Supabase Auth Setup | Configure Supabase Auth (email/password + Google OAuth). Set up auth middleware in Hono that validates JWT and extracts user. | 3h |
| E2-002 | Tenant Registration API | `POST /api/v1/tenants` — create tenant with name, slug, address, bank account. Auto-assign creating user as `owner`. Store `tenant_id` in JWT app_metadata. | 3h |
| E2-003 | Tenant Settings API | `GET/PATCH /api/v1/tenants/settings` — update business info, branding, invoice defaults, PPN config, bank accounts, QRIS. | 3h |
| E2-004 | User Management API | `GET/POST/PATCH/DELETE /api/v1/users` — invite users, assign roles, deactivate. Role-based permission checks. | 3h |
| E2-005 | Auth UI — Signup/Login | Web: signup page, login page, forgot password, Google OAuth button. Post-login redirect to dashboard or onboarding. | 4h |
| E2-006 | Onboarding Flow UI | Multi-step onboarding: business info → bank account → logo upload → invoice preferences. Skippable but encouraged. | 4h |
| E2-007 | Tenant Settings UI | Settings page: business profile, bank accounts, QRIS, invoice numbering, PPN config, branding. | 3h |
| E2-008 | RLS Policies | Implement Row-Level Security policies for all tables. Test cross-tenant isolation. | 2h |

**Total: ~25h**

---

## E3: Client & Product Management

> CRUD for clients and product catalog.

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E3-001 | Client CRUD API | `GET/POST/PATCH/DELETE /api/v1/clients` — full CRUD with pagination, search, soft-delete. Phone/WA number formatting for Indonesia (+62). | 3h |
| E3-002 | Client Management UI | Client list page (searchable, paginated), create/edit modal, client detail page with invoice history. | 4h |
| E3-003 | Product CRUD API | `GET/POST/PATCH/DELETE /api/v1/products` — full CRUD with categories, unit types, tax category. | 3h |
| E3-004 | Product Management UI | Product list page, create/edit modal, category filter. | 3h |

**Total: ~13h**

---

## E4: Invoice Core

> The heart of the system — create, edit, send, track invoices.

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E4-001 | Invoice Schema & Migration | Create `invoices` and `invoice_lines` tables with all fields, indexes, RLS. Status enum. Auto-numbering function. | 3h |
| E4-002 | Invoice CRUD API | `GET/POST/PATCH/DELETE /api/v1/invoices` — create with line items, auto-calculate totals (subtotal, discount, tax, total). Pagination with filters (status, client, date range). | 5h |
| E4-003 | Invoice Status Machine | State transition logic: draft→sent→viewed→partial→paid, overdue detection (cron), cancellation. Validation rules per transition. | 3h |
| E4-004 | Invoice Auto-Numbering | Configurable format: `{PREFIX}/{YYYY}/{MM}/{SEQ}`. Tenant-scoped sequential counter. Reset options (yearly, monthly, never). | 2h |
| E4-005 | Invoice List UI | Invoice list page with status tabs, search, date filter, client filter. Status badges with colors. Bulk actions (send, delete). | 4h |
| E4-006 | Invoice Create/Edit UI | Full invoice form: client selector (with inline create), line items (add/remove/reorder), product search, quantity/price/discount, PPN toggle, notes, due date picker. Real-time total calculation. | 6h |
| E4-007 | Invoice Detail UI | Invoice detail page: header info, line items table, payment history, activity timeline, action buttons (edit, send, record payment, download PDF, duplicate, cancel). | 4h |
| E4-008 | Public Invoice Page | Public route `/i/{public_token}` — displays invoice beautifully without auth. Shows pay button (Phase 2), download PDF. Track "viewed" status. | 3h |

**Total: ~30h**

---

## E5: Quotation System

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E5-001 | Quotation Schema & Migration | Create `quotations` and `quotation_lines` tables. | 2h |
| E5-002 | Quotation CRUD API | Full CRUD + status transitions + convert-to-invoice endpoint. | 4h |
| E5-003 | Quotation UI | List, create/edit form (similar to invoice), detail page, convert-to-invoice button. | 5h |

**Total: ~11h**

---

## E6: Payment System

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E6-001 | Payment Schema & Migration | Create `payments` table with all fields, indexes. | 2h |
| E6-002 | Payment Recording API | `POST /api/v1/invoices/:id/payments` — record payment, update invoice `amount_paid`/`amount_due`/`status`. Partial payment support. | 3h |
| E6-003 | Payment UI | Record payment modal (amount, method, date, reference, upload proof). Payment history on invoice detail. | 3h |

**Total: ~8h**

---

## E7: Midtrans Integration

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E7-001 | Midtrans Setup | Configure Midtrans sandbox + production keys. Create Midtrans service in API. | 2h |
| E7-002 | Snap Payment Flow | Generate Snap token for invoice, embed on public invoice page. Support VA, GoPay, ShopeePay, QRIS. | 4h |
| E7-003 | Payment Webhook | `POST /api/v1/webhooks/midtrans` — handle payment notification, auto-record payment, update invoice status. Signature verification. | 3h |
| E7-004 | Payment Status Page | After payment: success/pending/failed page with instructions (VA number, etc.). | 2h |

**Total: ~11h**

---

## E8: PDF Generation

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E8-001 | PDF Package Setup | Set up `packages/pdf` with @react-pdf/renderer. Create base invoice template component. | 3h |
| E8-002 | Invoice PDF Template | Professional template: tenant logo/info, client info, line items table, totals, bank details, QRIS code, notes/terms. Bahasa Indonesia formatting. | 5h |
| E8-003 | PDF Generation API | `POST /api/v1/invoices/:id/pdf` — generate PDF, upload to R2, store URL. Async via Queue for large batches. | 3h |
| E8-004 | PDF Preview & Download | Preview in browser, download button, regenerate if invoice updated. | 2h |

**Total: ~13h**

---

## E9: Notifications — Email & WhatsApp

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E9-001 | Email Package Setup | Set up `packages/email` with React Email + Resend. Create base templates. | 3h |
| E9-002 | Invoice Email Template | Beautiful email: invoice summary, amount, due date, "View Invoice" button, PDF attachment. Bahasa Indonesia. | 3h |
| E9-003 | Send Invoice via Email API | `POST /api/v1/invoices/:id/send` with `channel: email`. Queue-based sending, track delivery status. | 3h |
| E9-004 | WhatsApp Integration Setup | Configure Fonnte API. Create WA service: send message, send media, check delivery status. | 3h |
| E9-005 | Send Invoice via WhatsApp API | `POST /api/v1/invoices/:id/send` with `channel: whatsapp`. Format WA message with invoice summary + public link. | 3h |
| E9-006 | Notification Tracking | Track all notifications in `notifications` table. Show delivery status in invoice detail UI. | 2h |

**Total: ~17h**

---

## E10: Payment Reminders

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E10-001 | Reminder Configuration | Tenant settings: enable/disable reminders, frequency (3/7/14 days before due, 1/3/7 days after overdue), channel preference. | 3h |
| E10-002 | Reminder Cron Job | Cloudflare Cron Trigger: daily check for invoices needing reminders. Queue reminder notifications. | 3h |
| E10-003 | Reminder Templates | Email and WA reminder templates: gentle, firm, final notice. Bahasa Indonesia. | 2h |

**Total: ~8h**

---

## E11: Dashboard & Reports

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E11-001 | Dashboard API | Aggregate endpoints: revenue (current month/comparison), outstanding, overdue, invoice counts by status, top clients, recent activity. | 4h |
| E11-002 | Dashboard UI | Cards: revenue, outstanding, overdue. Charts: monthly revenue trend, invoice status breakdown. Recent invoices table. Quick actions. | 5h |
| E11-003 | Simple Reports | Revenue report (by period, by client), aging report (overdue buckets: 1-30, 31-60, 61-90, 90+ days), client statement. | 4h |
| E11-004 | Expense Report (Phase 2) | P&L report: revenue from invoices vs expenses by category. Monthly/quarterly view. | 3h |

**Total: ~16h**

---

## E12: AI Features

| Ticket | Title | Description | Estimate |
|--------|-------|-------------|----------|
| E12-001 | AI Package Setup | Set up `packages/ai` with Anthropic SDK. Create prompt templates, response parsers. Usage tracking. | 3h |
| E12-002 | Chat-to-Invoice API | `POST /api/v1/ai/chat-to-invoice` — send natural language, get structured invoice data. Match existing clients/products. Handle ambiguity. | 5h |
| E12-003 | Chat-to-Invoice UI | Chat-like input on invoice creation page. "Describe your invoice..." → preview → confirm → create. | 4h |
| E12-004 | AI Insights API | `GET /api/v1/ai/insights` — generate business insights from invoice/payment data. Cache results. | 4h |
| E12-005 | AI Insights Dashboard Widget | Card on dashboard with AI-generated insights. Refresh button. | 2h |
| E12-006 | Voice-to-Invoice (Phase 3) | Audio upload → Whisper transcription → Chat-to-Invoice pipeline. | 4h |

**Total: ~22h**

---

## E13–E17: Remaining Epics (Summarized)

| Epic | Tickets | Estimate |
|------|---------|----------|
| E13: Recurring Invoices | Schema, CRUD API, scheduler cron, UI | ~12h |
| E14: Credit Notes | Schema, CRUD API, link to invoices, UI | ~10h |
| E15: SaaS Billing | Subscription schema, plan enforcement middleware, billing UI, Midtrans subscription | ~15h |
| E16: Client Portal | Auth for clients, invoice list, payment, download | ~12h |
| E17: Mobile App (iOS) | Expo setup, shared packages integration, core screens, push notifications | ~40h |

---

## Timeline Summary

| Phase | Epics | Duration | Milestone |
|-------|-------|----------|-----------|
| **Phase 1 (MVP)** | E1–E9 | 6-8 weeks | Core invoicing: create, send (email+WA), track payments, PDF |
| **Phase 2 (Growth)** | E10–E15 | 4-6 weeks | Midtrans online payments, AI features, recurring, reminders, billing |
| **Phase 3 (Scale)** | E16–E17 | 4-6 weeks | Client portal, mobile app, advanced AI |

**Total estimated effort: ~260-300 hours**

---

## Implementation Priority (First 10 Tickets)

The exact order to build, respecting dependencies:

1. `E1-001` — Monorepo Setup
2. `E1-006` — Shared Package
3. `E1-002` — Database Package
4. `E1-003` — API App Scaffold
5. `E1-004` — Web App Scaffold
6. `E1-005` — CI/CD Pipeline
7. `E2-001` — Supabase Auth Setup
8. `E2-008` — RLS Policies
9. `E2-002` — Tenant Registration API
10. `E2-005` — Auth UI — Signup/Login
