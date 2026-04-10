package model

// APIResponse is the standard API response envelope.
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Code    string      `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

// HealthResponse is returned by GET /health.
type HealthResponse struct {
	Status      string `json:"status"`
	Version     string `json:"version"`
	Environment string `json:"environment"`
	Timestamp   string `json:"timestamp"`
}

// AuthMeResponse is returned by GET /api/v1/auth/me.
type AuthMeResponse struct {
	ID        string          `json:"id"`
	Email     string          `json:"email"`
	FullName  string          `json:"fullName,omitempty"`
	AvatarURL *string         `json:"avatarUrl"`
	Role      string          `json:"role,omitempty"`
	Locale    string          `json:"locale,omitempty"`
	HasTenant bool            `json:"hasTenant"`
	Tenant    *TenantSummary  `json:"tenant,omitempty"`
}

// TenantSummary is a minimal tenant object for auth/me.
type TenantSummary struct {
	ID               string  `json:"id"`
	Slug             string  `json:"slug"`
	Name             string  `json:"name"`
	SubscriptionPlan string  `json:"subscriptionPlan"`
	LogoURL          *string `json:"logoUrl"`
}

// CreateTenantResponse is returned by POST /api/v1/tenants.
type CreateTenantResponse struct {
	Tenant CreatedTenantData `json:"tenant"`
	User   CreatedUserData   `json:"user"`
}

// CreatedTenantData is the tenant portion of the create response.
type CreatedTenantData struct {
	ID               string  `json:"id"`
	Slug             string  `json:"slug"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	Phone            *string `json:"phone"`
	BusinessType     string  `json:"businessType"`
	SubscriptionPlan string  `json:"subscriptionPlan"`
	CreatedAt        string  `json:"createdAt"`
}

// CreatedUserData is the user portion of the create response.
type CreatedUserData struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"fullName"`
	Role     string `json:"role"`
}

// TenantMeResponse is the full tenant returned by GET /api/v1/tenants/me.
type TenantMeResponse struct {
	ID                      string              `json:"id"`
	Slug                    string              `json:"slug"`
	Name                    string              `json:"name"`
	Email                   string              `json:"email"`
	Phone                   *string             `json:"phone"`
	Address                 *string             `json:"address"`
	City                    *string             `json:"city"`
	Province                *string             `json:"province"`
	PostalCode              *string             `json:"postalCode"`
	NPWP                    *string             `json:"npwp"`
	BusinessType            string              `json:"businessType"`
	LogoURL                 *string             `json:"logoUrl"`
	SubscriptionPlan        string              `json:"subscriptionPlan"`
	SubscriptionExpiresAt   *string             `json:"subscriptionExpiresAt"`
	InvoicePrefix           string              `json:"invoicePrefix"`
	InvoiceFormat           string              `json:"invoiceFormat"`
	QuotationPrefix         string              `json:"quotationPrefix"`
	DefaultCurrency         string              `json:"defaultCurrency"`
	DefaultPaymentTermsDays int                 `json:"defaultPaymentTermsDays"`
	DefaultNotes            *string             `json:"defaultNotes"`
	DefaultTerms            *string             `json:"defaultTerms"`
	PPNEnabled              bool                `json:"ppnEnabled"`
	PPNRate                 string              `json:"ppnRate"`
	Branding                interface{}         `json:"branding"`
	BankAccounts            []BankAccountData   `json:"bankAccounts"`
	CreatedAt               string              `json:"createdAt"`
	UpdatedAt               string              `json:"updatedAt"`
}

// BankAccountData is a bank account in the tenant/me response.
type BankAccountData struct {
	ID                string  `json:"id"`
	BankName          string  `json:"bankName"`
	BankCode          *string `json:"bankCode"`
	AccountNumber     string  `json:"accountNumber"`
	AccountHolderName string  `json:"accountHolderName"`
	IsPrimary         bool    `json:"isPrimary"`
}

// UploadResponse is returned by upload endpoints.
type UploadResponse struct {
	URL string `json:"url"`
	Key string `json:"key"`
}

// DeleteResponse is returned by DELETE upload.
type DeleteResponse struct {
	Deleted string `json:"deleted"`
}

// SettingsResponse is returned by GET /api/v1/tenants/settings.
type SettingsResponse struct {
	ID                      string            `json:"id"`
	Slug                    string            `json:"slug"`
	Name                    string            `json:"name"`
	Email                   string            `json:"email"`
	Phone                   *string           `json:"phone"`
	Address                 *string           `json:"address"`
	City                    *string           `json:"city"`
	Province                *string           `json:"province"`
	PostalCode              *string           `json:"postalCode"`
	NPWP                    *string           `json:"npwp"`
	BusinessType            string            `json:"businessType"`
	LogoURL                 *string           `json:"logoUrl"`
	SubscriptionPlan        string            `json:"subscriptionPlan"`
	SubscriptionExpiresAt   *string           `json:"subscriptionExpiresAt"`
	InvoicePrefix           string            `json:"invoicePrefix"`
	InvoiceFormat           string            `json:"invoiceFormat"`
	QuotationPrefix         string            `json:"quotationPrefix"`
	CreditNotePrefix        string            `json:"creditNotePrefix"`
	DefaultCurrency         string            `json:"defaultCurrency"`
	DefaultPaymentTermsDays int               `json:"defaultPaymentTermsDays"`
	DefaultNotes            *string           `json:"defaultNotes"`
	DefaultTerms            *string           `json:"defaultTerms"`
	PPNEnabled              bool              `json:"ppnEnabled"`
	PPNRate                 string            `json:"ppnRate"`
	Branding                interface{}       `json:"branding"`
	BankAccounts            []BankAccountData `json:"bankAccounts"`
	QRIS                    *QRISData         `json:"qris"`
	CreatedAt               string            `json:"createdAt"`
	UpdatedAt               string            `json:"updatedAt"`
}

// QRISData holds QRIS info returned in settings.
type QRISData struct {
	ID           string `json:"id"`
	QrisImageURL string `json:"qrisImageUrl"`
	QrisNMID     string `json:"qrisNmid,omitempty"`
	IsActive     bool   `json:"isActive"`
}
