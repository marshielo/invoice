package model

import (
	"encoding/json"
	"time"
)

// Tenant represents the tenants table.
type Tenant struct {
	ID                        string          `json:"id" db:"id"`
	Slug                      string          `json:"slug" db:"slug"`
	Name                      string          `json:"name" db:"name"`
	Email                     string          `json:"email" db:"email"`
	Phone                     *string         `json:"phone,omitempty" db:"phone"`
	Address                   *string         `json:"address,omitempty" db:"address"`
	City                      *string         `json:"city,omitempty" db:"city"`
	Province                  *string         `json:"province,omitempty" db:"province"`
	PostalCode                *string         `json:"postal_code,omitempty" db:"postal_code"`
	NPWP                      *string         `json:"npwp,omitempty" db:"npwp"`
	BusinessType              string          `json:"business_type" db:"business_type"`
	LogoURL                   *string         `json:"logo_url,omitempty" db:"logo_url"`
	SubscriptionPlan          string          `json:"subscription_plan" db:"subscription_plan"`
	SubscriptionExpiresAt     *time.Time      `json:"subscription_expires_at,omitempty" db:"subscription_expires_at"`
	InvoicePrefix             string          `json:"invoice_prefix" db:"invoice_prefix"`
	InvoiceFormat             string          `json:"invoice_format" db:"invoice_format"`
	InvoiceSequenceCounter    int             `json:"invoice_sequence_counter" db:"invoice_sequence_counter"`
	QuotationPrefix           string          `json:"quotation_prefix" db:"quotation_prefix"`
	QuotationSequenceCounter  int             `json:"quotation_sequence_counter" db:"quotation_sequence_counter"`
	CreditNotePrefix          string          `json:"credit_note_prefix" db:"credit_note_prefix"`
	CreditNoteSequenceCounter int             `json:"credit_note_sequence_counter" db:"credit_note_sequence_counter"`
	DefaultCurrency           string          `json:"default_currency" db:"default_currency"`
	DefaultPaymentTermsDays   int             `json:"default_payment_terms_days" db:"default_payment_terms_days"`
	DefaultNotes              *string         `json:"default_notes,omitempty" db:"default_notes"`
	DefaultTerms              *string         `json:"default_terms,omitempty" db:"default_terms"`
	PPNEnabled                bool            `json:"ppn_enabled" db:"ppn_enabled"`
	PPNRate                   string          `json:"ppn_rate" db:"ppn_rate"`
	Branding                  json.RawMessage `json:"branding,omitempty" db:"branding"`
	CreatedAt                 time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt                 time.Time       `json:"updated_at" db:"updated_at"`
	DeletedAt                 *time.Time      `json:"deleted_at,omitempty" db:"deleted_at"`
}

// TenantBankAccount represents the tenant_bank_accounts table.
type TenantBankAccount struct {
	ID                string    `json:"id" db:"id"`
	TenantID          string    `json:"tenant_id" db:"tenant_id"`
	BankName          string    `json:"bank_name" db:"bank_name"`
	AccountNumber     string    `json:"account_number" db:"account_number"`
	AccountHolderName string    `json:"account_holder_name" db:"account_holder_name"`
	BankCode          *string   `json:"bank_code,omitempty" db:"bank_code"`
	IsPrimary         bool      `json:"is_primary" db:"is_primary"`
	IsActive          bool      `json:"is_active" db:"is_active"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
}

// TenantQris represents the tenant_qris table.
type TenantQris struct {
	ID           string    `json:"id" db:"id"`
	TenantID     string    `json:"tenant_id" db:"tenant_id"`
	QrisImageURL string    `json:"qris_image_url" db:"qris_image_url"`
	QrisNMID     *string   `json:"qris_nmid,omitempty" db:"qris_nmid"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// TenantWithBankAccounts is a tenant with its active bank accounts.
type TenantWithBankAccounts struct {
	Tenant
	BankAccounts []TenantBankAccount `json:"bank_accounts"`
}
