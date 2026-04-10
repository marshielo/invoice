package model

// CreateTenantRequest is the request body for POST /api/v1/tenants.
type CreateTenantRequest struct {
	Name         string  `json:"name" binding:"required,min=2,max=255"`
	Slug         string  `json:"slug" binding:"required,min=3,max=63,slug"`
	BusinessType string  `json:"businessType" binding:"required,oneof=florist freelancer workshop retail food_beverage fashion service other"`
	Email        string  `json:"email" binding:"required,email"`
	Phone        *string `json:"phone,omitempty" binding:"omitempty,min=8,max=20"`
	Address      *string `json:"address,omitempty" binding:"omitempty,max=500"`
	City         *string `json:"city,omitempty" binding:"omitempty,max=100"`
	Province     *string `json:"province,omitempty" binding:"omitempty,max=100"`
	PostalCode   *string `json:"postalCode,omitempty" binding:"omitempty,max=10"`
	FullName     string  `json:"fullName" binding:"required,min=1,max=255"`
}

// UpdateSettingsRequest is the body for PATCH /api/v1/tenants/settings.
// All fields are optional — only provided fields are updated.
type UpdateSettingsRequest struct {
	Name                    *string `json:"name" binding:"omitempty,min=2,max=255"`
	Email                   *string `json:"email" binding:"omitempty,email"`
	Phone                   *string `json:"phone" binding:"omitempty,max=20"`
	Address                 *string `json:"address" binding:"omitempty,max=500"`
	City                    *string `json:"city" binding:"omitempty,max=100"`
	Province                *string `json:"province" binding:"omitempty,max=100"`
	PostalCode              *string `json:"postalCode" binding:"omitempty,max=10"`
	NPWP                    *string `json:"npwp" binding:"omitempty,max=30"`
	BusinessType            *string `json:"businessType" binding:"omitempty,oneof=florist freelancer workshop retail food_beverage fashion service other"`
	InvoicePrefix           *string `json:"invoicePrefix" binding:"omitempty,min=1,max=20"`
	InvoiceFormat           *string `json:"invoiceFormat" binding:"omitempty,max=50"`
	QuotationPrefix         *string `json:"quotationPrefix" binding:"omitempty,min=1,max=20"`
	CreditNotePrefix        *string `json:"creditNotePrefix" binding:"omitempty,min=1,max=20"`
	DefaultCurrency         *string `json:"defaultCurrency" binding:"omitempty,len=3"`
	DefaultPaymentTermsDays *int    `json:"defaultPaymentTermsDays" binding:"omitempty,min=0,max=365"`
	DefaultNotes            *string `json:"defaultNotes" binding:"omitempty"`
	DefaultTerms            *string `json:"defaultTerms" binding:"omitempty"`
	PPNEnabled              *bool   `json:"ppnEnabled"`
	PPNRate                 *string `json:"ppnRate" binding:"omitempty"`
}

// CreateBankAccountRequest is the body for POST /api/v1/tenants/settings/bank-accounts.
type CreateBankAccountRequest struct {
	BankName          string  `json:"bankName" binding:"required,min=1,max=100"`
	AccountNumber     string  `json:"accountNumber" binding:"required,min=1,max=100"`
	AccountHolderName string  `json:"accountHolderName" binding:"required,min=1,max=255"`
	BankCode          *string `json:"bankCode" binding:"omitempty,max=20"`
	IsPrimary         bool    `json:"isPrimary"`
}
