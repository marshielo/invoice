# Product Requirements Document (PRD)

## Invoicein — Invoice Generator SaaS for Indonesian UMKM

**Version:** 1.0
**Date:** 2026-04-09
**Status:** Draft

---

## 1. Executive Summary

**Invoicein** is an AI-powered invoice management SaaS built for Indonesian UMKM (micro, small, and medium enterprises). It lets business owners create, send, and track invoices without needing accounting knowledge — using natural language, voice input, and WhatsApp as the primary delivery channel.

**Vision:** The simplest way for any Indonesian business to get paid professionally.

**Why now:** Indonesia has 65M+ UMKM, most still use manual invoicing (paper, WhatsApp photos of handwritten notes, or basic spreadsheets). Existing solutions like Kledo, Jurnal, or Paper.id are built for accountants — we build for the **business owner** who just wants to send a bill and get paid.

---

## 2. Unique Value Propositions (What Makes Us Different)

### 2.1 AI-First Invoicing
| Feature | Description |
|---------|-------------|
| **Chat-to-Invoice** | Type "Buket mawar 12 tangkai 350rb buat Bu Sari" → AI generates a full professional invoice |
| **Voice-to-Invoice** | Voice note → AI transcribes and creates the invoice (huge for UMKM who aren't keyboard-savvy) |
| **Smart Reminders** | AI determines optimal reminder timing based on client payment history |
| **Cashflow Insights** | "Bulan ini pemasukan turun 20% dari bulan lalu, 5 invoice belum dibayar total Rp 8.5 juta" |
| **Auto-categorization** | AI categorizes products/services for simple bookkeeping |

### 2.2 WhatsApp-Native
| Feature | Description |
|---------|-------------|
| **Send via WA** | One-tap send invoice as a beautiful message + PDF to client's WhatsApp |
| **Payment Reminders** | Automated gentle reminders via WA with configurable frequency |
| **Payment Confirmation** | Client taps "Sudah Bayar" in WA → triggers payment recording flow |
| **WA Bot (Phase 2)** | Create invoices by sending a WA message to your Invoicein number |

### 2.3 UMKM-First Design
| Feature | Description |
|---------|-------------|
| **Bahasa Indonesia** | UI and all templates default to Bahasa Indonesia (English available) |
| **QRIS Ready** | Show QRIS code directly on invoices for instant payment |
| **Bank Transfer Details** | Pre-configured Indonesian bank templates (BCA, Mandiri, BRI, BNI, etc.) |
| **PPN Built-in** | 11% PPN toggle with proper tax invoice formatting |
| **Dead-simple UI** | No accounting jargon — "Buat Tagihan", "Pelanggan", "Produk" |

---

## 3. User Personas

### Persona 1: Ibu Ratna — Florist (Primary)
- **Business:** "Ratna Florist", 2 years old, 1-3 employees
- **Pain:** Writes invoices on paper, sends photos via WA. Loses track of who has paid.
- **Tech:** Uses smartphone daily (WA, Instagram, Shopee). No laptop.
- **Need:** Quick invoice creation, WA delivery, payment tracking.

### Persona 2: Mas Aldi — Freelance Designer
- **Business:** Solo freelancer, works with 5-10 clients/month
- **Pain:** Uses Google Docs templates, manually edits each time. No recurring billing.
- **Tech:** Comfortable with web apps, uses laptop.
- **Need:** Professional templates, recurring invoices, client portal.

### Persona 3: Pak Budi — Small Workshop Owner
- **Business:** "Budi Mebel", 5-10 employees, B2B and B2C
- **Pain:** Uses Excel, accountant comes monthly. No real-time visibility.
- **Tech:** Basic smartphone user, prefers WA over apps.
- **Need:** Multi-user access, quotation-to-invoice flow, expense tracking, simple reports.

---

## 4. Feature Breakdown by Phase

### Phase 1 — MVP (Month 1-2)
> Goal: Core invoicing loop — create, send, get paid, track.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F1 | Tenant Registration | P0 | Business signup with name, address, NPWP (optional), bank details |
| F2 | Authentication | P0 | Email/password + Google OAuth via Supabase Auth |
| F3 | Client Management | P0 | CRUD clients (name, email, phone/WA, address, notes) |
| F4 | Product/Service Catalog | P0 | CRUD products with name, description, unit, price, tax category |
| F5 | Invoice Creation | P0 | Create invoice with line items, discounts, PPN, notes, due date |
| F6 | Invoice PDF Generation | P0 | Professional PDF with tenant branding, bank details, QRIS |
| F7 | Send via Email | P0 | Send invoice PDF as email attachment with customizable template |
| F8 | Send via WhatsApp | P0 | Send invoice link + PDF via WhatsApp API |
| F9 | Payment Recording | P0 | Record manual payments (bank transfer, cash, QRIS) |
| F10 | Dashboard | P0 | Overview: total revenue, outstanding, overdue, recent activity |
| F11 | Invoice Numbering | P0 | Configurable auto-numbering format (e.g., INV/2026/04/001) |
| F12 | Multi-user & Roles | P1 | Owner, Admin, Staff roles with permission matrix |
| F13 | Quotation System | P1 | Create quotations, convert accepted quotes to invoices |
| F14 | Public Invoice Page | P1 | Shareable link where client views invoice + pays online |

### Phase 2 — Growth (Month 3-4)
> Goal: Automation, payments, and intelligence.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F15 | Midtrans Payment Gateway | P0 | Online payment via the public invoice page (VA, e-wallet, CC) |
| F16 | Chat-to-Invoice (AI) | P0 | Natural language input → structured invoice via LLM |
| F17 | Recurring Invoices | P1 | Schedule auto-generation (weekly, monthly, custom) |
| F18 | Payment Reminders | P1 | Automated email + WA reminders for overdue invoices |
| F19 | Credit Notes | P1 | Issue refunds/credits linked to original invoice |
| F20 | Client Portal | P1 | Clients log in to view all their invoices, download PDFs, pay |
| F21 | Expense Tracking | P2 | Record business expenses with categories and receipts |
| F22 | Profit & Loss Report | P2 | Simple monthly P&L based on invoices and expenses |
| F23 | Voice-to-Invoice (AI) | P2 | Voice recording → transcription → invoice generation |

### Phase 3 — Scale (Month 5-6)
> Goal: Mobile, advanced AI, and enterprise readiness.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F24 | iOS App (React Native) | P0 | Full-featured mobile app for iOS |
| F25 | AI Cashflow Insights | P1 | Dashboard widget with AI-generated business insights |
| F26 | Smart Payment Prediction | P1 | Predict which clients will pay late based on history |
| F27 | Multi-currency | P2 | Support USD, SGD, MYR for export-oriented UMKM |
| F28 | API Access | P2 | Public REST API for integrations (Zapier, custom) |
| F29 | Tax Report (e-Faktur) | P2 | Generate CSV/report compatible with DJP e-Faktur |
| F30 | WA Bot Interface | P2 | Create and manage invoices entirely via WhatsApp |
| F31 | Custom Subdomain | P2 | tenant.invoicein.id for the client portal |
| F32 | Inventory Tracking | P2 | Stock levels tied to product catalog, auto-deduct on invoice |

---

## 5. Pricing Model

| Plan | Price | Limits |
|------|-------|--------|
| **Gratis** | Rp 0/bulan | 10 invoices/month, 1 user, Invoicein branding on PDF, basic templates |
| **Profesional** | Rp 99.000/bulan or Rp 999.000/tahun | Unlimited invoices, 5 users, custom branding, WA integration, all templates, AI features (50 prompts/month) |
| **Bisnis** | Rp 249.000/bulan or Rp 2.499.000/tahun | Everything in Pro + unlimited users, API access, priority support, AI unlimited, client portal, recurring invoices |

> **Pricing Strategy:** Start generous with the free tier to acquire UMKM users. Conversion trigger = hitting 10 invoice limit or needing WA integration.

---

## 6. Acceptance Criteria (MVP — Phase 1)

### F1: Tenant Registration
- [ ] User can register with business name, email, password
- [ ] User can set business address, phone, bank account details
- [ ] Optional NPWP input with validation (15-16 digit format)
- [ ] Tenant gets a unique slug (e.g., `ratna-florist`)
- [ ] Default invoice numbering format is set on creation

### F5: Invoice Creation
- [ ] User can select an existing client or create inline
- [ ] User can add multiple line items (product from catalog or custom)
- [ ] Each line item has: description, quantity, unit, unit price, discount, subtotal
- [ ] PPN toggle (11%) applied per-line or on total
- [ ] Additional discount (percentage or fixed) on total
- [ ] Notes/terms field with customizable default
- [ ] Due date picker with presets (7, 14, 30, 60 days)
- [ ] Auto-calculated totals (subtotal, discount, tax, grand total)
- [ ] Invoice status: `draft` → `sent` → `viewed` → `partial` → `paid` → `overdue` → `cancelled`
- [ ] Save as draft or send immediately

### F8: Send via WhatsApp
- [ ] User can send invoice to client's WA number with one click
- [ ] Message includes: greeting, invoice summary (number, amount, due date), and a link to the public invoice page
- [ ] PDF is attached (or linked)
- [ ] Delivery status tracked (sent, delivered, read — if API supports)

### F10: Dashboard
- [ ] Shows total revenue (paid invoices) for current month
- [ ] Shows total outstanding (unpaid) amount
- [ ] Shows total overdue amount with count
- [ ] Recent invoices list (last 10)
- [ ] Quick action buttons: "Buat Tagihan", "Tambah Pelanggan"

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Performance** | Page load < 2s, Invoice PDF generation < 3s |
| **Availability** | 99.9% uptime |
| **Security** | Row-Level Security (RLS) per tenant, encrypted PII, HTTPS everywhere |
| **Scalability** | Support 10,000 tenants, 1M invoices without architecture changes |
| **Localization** | Bahasa Indonesia (primary), English (secondary) |
| **Mobile** | Responsive web (Phase 1), Native iOS (Phase 3) |
| **Compliance** | PPN calculation per Indonesian tax law, e-Faktur compatible output |
| **Data Retention** | Invoice data retained for 10 years (Indonesian tax requirement) |

---

## 8. Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Registered tenants | 1,000 |
| Monthly active tenants | 300 |
| Invoices created/month | 5,000 |
| Paid conversion rate | 5-8% (Free → Pro) |
| MRR | Rp 15,000,000 |
| NPS | > 40 |
| Churn rate | < 5%/month |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WhatsApp API cost/limitations | High | Start with Fonnte (affordable), migrate to official WA Business API at scale |
| AI costs per-invoice | Medium | Cache common patterns, limit free tier AI usage, use efficient models |
| UMKM low willingness to pay | High | Generous free tier, prove value before paywall, focus on WA (they already live there) |
| Midtrans integration complexity | Medium | Start with basic VA + e-wallet, expand payment methods gradually |
| Competition from Kledo/Paper.id | Medium | Differentiate on simplicity + AI + WA-native, not on feature count |
