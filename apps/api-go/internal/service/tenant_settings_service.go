package service

import (
	"context"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
)

// Plan limits for bank accounts per subscription tier.
var bankAccountLimits = map[string]int{
	"free":         5,
	"professional": 10,
	"business":     20,
}

// TenantSettingsService handles tenant settings business logic.
type TenantSettingsService struct {
	tenantRepo  *repository.TenantRepository
	storageRepo *repository.StorageRepository
}

// NewTenantSettingsService creates a new TenantSettingsService.
func NewTenantSettingsService(
	tenantRepo *repository.TenantRepository,
	storageRepo *repository.StorageRepository,
) *TenantSettingsService {
	return &TenantSettingsService{
		tenantRepo:  tenantRepo,
		storageRepo: storageRepo,
	}
}

// SettingsResult holds the full settings response data.
type SettingsResult struct {
	Tenant       *model.Tenant
	BankAccounts []model.TenantBankAccount
	QRIS         *model.TenantQris
}

// GetSettings returns the full tenant settings including bank accounts and QRIS.
func (s *TenantSettingsService) GetSettings(ctx context.Context, tenantID string) (*SettingsResult, error) {
	tenant, err := s.tenantRepo.FindByID(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tenant: %w", err)
	}
	if tenant == nil {
		return nil, &NotFoundError{Resource: "Tenant"}
	}

	accounts, err := s.fetchBankAccounts(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch bank accounts: %w", err)
	}

	qris, err := s.tenantRepo.FindActiveQRIS(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch QRIS: %w", err)
	}

	return &SettingsResult{
		Tenant:       tenant,
		BankAccounts: accounts,
		QRIS:         qris,
	}, nil
}

// UpdateSettings applies a partial update to tenant settings.
// Only non-nil request fields are written to the database.
func (s *TenantSettingsService) UpdateSettings(ctx context.Context, tenantID string, req *model.UpdateSettingsRequest) (*model.Tenant, error) {
	fields := make(map[string]interface{})

	if req.Name != nil {
		fields["name"] = *req.Name
	}
	if req.Email != nil {
		fields["email"] = *req.Email
	}
	if req.Phone != nil {
		fields["phone"] = *req.Phone
	}
	if req.Address != nil {
		fields["address"] = *req.Address
	}
	if req.City != nil {
		fields["city"] = *req.City
	}
	if req.Province != nil {
		fields["province"] = *req.Province
	}
	if req.PostalCode != nil {
		fields["postal_code"] = *req.PostalCode
	}
	if req.NPWP != nil {
		fields["npwp"] = *req.NPWP
	}
	if req.BusinessType != nil {
		fields["business_type"] = *req.BusinessType
	}
	if req.InvoicePrefix != nil {
		fields["invoice_prefix"] = *req.InvoicePrefix
	}
	if req.InvoiceFormat != nil {
		if err := validateInvoiceFormat(*req.InvoiceFormat); err != nil {
			return nil, &ValidationError{Message: err.Error()}
		}
		fields["invoice_format"] = *req.InvoiceFormat
	}
	if req.QuotationPrefix != nil {
		fields["quotation_prefix"] = *req.QuotationPrefix
	}
	if req.CreditNotePrefix != nil {
		fields["credit_note_prefix"] = *req.CreditNotePrefix
	}
	if req.DefaultCurrency != nil {
		fields["default_currency"] = *req.DefaultCurrency
	}
	if req.DefaultPaymentTermsDays != nil {
		fields["default_payment_terms_days"] = *req.DefaultPaymentTermsDays
	}
	if req.DefaultNotes != nil {
		fields["default_notes"] = *req.DefaultNotes
	}
	if req.DefaultTerms != nil {
		fields["default_terms"] = *req.DefaultTerms
	}
	if req.PPNEnabled != nil {
		fields["ppn_enabled"] = *req.PPNEnabled
	}
	if req.PPNRate != nil {
		fields["ppn_rate"] = *req.PPNRate
	}

	if len(fields) == 0 {
		// Nothing to update — fetch and return current state
		return s.tenantRepo.FindByID(ctx, tenantID)
	}

	if err := s.tenantRepo.UpdateSettings(ctx, tenantID, fields); err != nil {
		return nil, fmt.Errorf("failed to update settings: %w", err)
	}

	return s.tenantRepo.FindByID(ctx, tenantID)
}

// UploadLogo uploads a new logo to R2, updates the tenant's logo_url.
func (s *TenantSettingsService) UploadLogo(ctx context.Context, tenantID string, data []byte, contentType string) (*UploadResult, error) {
	limit := repository.UploadLimits["logo"]
	if err := repository.ValidateUpload(contentType, int64(len(data)), limit); err != nil {
		return nil, &ValidationError{Message: err.Error()}
	}

	ext := repository.ExtFromContentType(contentType)
	key := repository.StorageKeys.TenantLogo(tenantID, ext)

	url, err := s.storageRepo.Upload(ctx, key, data, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload logo: %w", err)
	}

	if err := s.tenantRepo.UpdateLogoURL(ctx, tenantID, url); err != nil {
		return nil, fmt.Errorf("failed to update logo_url: %w", err)
	}

	return &UploadResult{URL: url, Key: key}, nil
}

// GetBankAccounts returns all active bank accounts for a tenant.
func (s *TenantSettingsService) GetBankAccounts(ctx context.Context, tenantID string) ([]model.TenantBankAccount, error) {
	accounts, err := s.fetchBankAccounts(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch bank accounts: %w", err)
	}
	return accounts, nil
}

// AddBankAccount adds a new bank account, enforcing plan limits.
func (s *TenantSettingsService) AddBankAccount(ctx context.Context, tenantID string, req *model.CreateBankAccountRequest, subscriptionPlan string) (*model.TenantBankAccount, error) {
	limit, ok := bankAccountLimits[subscriptionPlan]
	if !ok {
		limit = bankAccountLimits["free"]
	}

	count, err := s.tenantRepo.CountActiveBankAccounts(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to count bank accounts: %w", err)
	}
	if count >= limit {
		return nil, &PlanLimitError{
			Message: fmt.Sprintf("Batas akun bank untuk paket %s adalah %d", subscriptionPlan, limit),
		}
	}

	ba := &model.TenantBankAccount{
		TenantID:          tenantID,
		BankName:          req.BankName,
		AccountNumber:     req.AccountNumber,
		AccountHolderName: req.AccountHolderName,
		BankCode:          req.BankCode,
		IsPrimary:         req.IsPrimary || count == 0, // first account is always primary
		IsActive:          true,
	}

	if err := s.tenantRepo.CreateBankAccount(ctx, ba); err != nil {
		return nil, fmt.Errorf("failed to create bank account: %w", err)
	}

	return ba, nil
}

// DeleteBankAccount soft-deletes a bank account by ID.
func (s *TenantSettingsService) DeleteBankAccount(ctx context.Context, id, tenantID string) error {
	deleted, err := s.tenantRepo.DeleteBankAccount(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("failed to delete bank account: %w", err)
	}
	if !deleted {
		return &NotFoundError{Resource: "Bank account"}
	}
	return nil
}

// UploadQRIS uploads a QRIS image to R2 and upserts the tenant_qris record.
func (s *TenantSettingsService) UploadQRIS(ctx context.Context, tenantID string, data []byte, contentType string) (*UploadResult, error) {
	limit := repository.UploadLimits["qris"]
	if err := repository.ValidateUpload(contentType, int64(len(data)), limit); err != nil {
		return nil, &ValidationError{Message: err.Error()}
	}

	ext := repository.ExtFromContentType(contentType)
	key := repository.StorageKeys.TenantQris(tenantID, ext)

	url, err := s.storageRepo.Upload(ctx, key, data, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload QRIS: %w", err)
	}

	if _, err := s.tenantRepo.UpsertQRIS(ctx, tenantID, url); err != nil {
		return nil, fmt.Errorf("failed to save QRIS: %w", err)
	}

	return &UploadResult{URL: url, Key: key}, nil
}

// fetchBankAccounts is an internal helper that queries bank accounts directly by tenantID.
func (s *TenantSettingsService) fetchBankAccounts(ctx context.Context, tenantID string) ([]model.TenantBankAccount, error) {
	// Delegate to a method on tenant_repository that accepts tenantID directly
	return s.tenantRepo.FindBankAccountsByTenantID(ctx, tenantID)
}

// validateInvoiceFormat checks that the format string contains at least {SEQ}.
func validateInvoiceFormat(format string) error {
	if len(format) == 0 {
		return fmt.Errorf("format invoice tidak boleh kosong")
	}
	// Must contain {SEQ} placeholder
	if !containsPlaceholder(format, "{SEQ}") {
		return fmt.Errorf("format invoice harus mengandung placeholder {SEQ}")
	}
	return nil
}

func containsPlaceholder(s, placeholder string) bool {
	for i := 0; i <= len(s)-len(placeholder); i++ {
		if s[i:i+len(placeholder)] == placeholder {
			return true
		}
	}
	return false
}

// PlanLimitError indicates a subscription plan limit was exceeded.
type PlanLimitError struct {
	Message string
}

func (e *PlanLimitError) Error() string { return e.Message }

