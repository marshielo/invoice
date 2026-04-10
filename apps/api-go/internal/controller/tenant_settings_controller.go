package controller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// TenantSettingsController handles tenant settings endpoints.
type TenantSettingsController struct {
	settingsService *service.TenantSettingsService
	tenantService   *service.TenantService
}

// NewTenantSettingsController creates a new TenantSettingsController.
func NewTenantSettingsController(
	settingsService *service.TenantSettingsService,
	tenantService *service.TenantService,
) *TenantSettingsController {
	return &TenantSettingsController{
		settingsService: settingsService,
		tenantService:   tenantService,
	}
}

// GetSettings handles GET /api/v1/tenants/settings.
func (tc *TenantSettingsController) GetSettings(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	result, err := tc.settingsService.GetSettings(c.Request.Context(), tenantID)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Tenant")
		default:
			response.InternalError(c, "Gagal memuat pengaturan")
		}
		return
	}

	response.Success(c, buildSettingsResponse(result))
}

// UpdateSettings handles PATCH /api/v1/tenants/settings.
func (tc *TenantSettingsController) UpdateSettings(c *gin.Context) {
	if !requireAdminRole(c) {
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	tenant, err := tc.settingsService.UpdateSettings(c.Request.Context(), tenantID, &req)
	if err != nil {
		switch err.(type) {
		case *service.ValidationError:
			response.ValidationError(c, err.Error(), nil)
		default:
			response.InternalError(c, "Gagal memperbarui pengaturan")
		}
		return
	}

	// Re-fetch full settings to return complete picture
	result, err := tc.settingsService.GetSettings(c.Request.Context(), tenant.ID)
	if err != nil {
		response.Success(c, gin.H{"message": "Pengaturan berhasil diperbarui"})
		return
	}

	response.Success(c, buildSettingsResponse(result))
}

// UploadLogo handles POST /api/v1/tenants/settings/logo.
func (tc *TenantSettingsController) UploadLogo(c *gin.Context) {
	if !requireAdminRole(c) {
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)
	data, contentType, err := extractFile(c)
	if err != nil {
		response.ValidationError(c, err.Error(), nil)
		return
	}

	result, err := tc.settingsService.UploadLogo(c.Request.Context(), tenantID, data, contentType)
	if err != nil {
		handleStorageError(c, err)
		return
	}

	response.Success(c, model.UploadResponse{URL: result.URL, Key: result.Key})
}

// GetBankAccounts handles GET /api/v1/tenants/settings/bank-accounts.
func (tc *TenantSettingsController) GetBankAccounts(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	accounts, err := tc.settingsService.GetBankAccounts(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Gagal memuat akun bank")
		return
	}

	data := make([]model.BankAccountData, len(accounts))
	for i, ba := range accounts {
		data[i] = model.BankAccountData{
			ID:                ba.ID,
			BankName:          ba.BankName,
			BankCode:          ba.BankCode,
			AccountNumber:     ba.AccountNumber,
			AccountHolderName: ba.AccountHolderName,
			IsPrimary:         ba.IsPrimary,
		}
	}

	response.Success(c, data)
}

// AddBankAccount handles POST /api/v1/tenants/settings/bank-accounts.
func (tc *TenantSettingsController) AddBankAccount(c *gin.Context) {
	if !requireAdminRole(c) {
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.CreateBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	// Need subscription plan for limit check — fetch tenant
	tenant, err := tc.settingsService.GetSettings(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Gagal memuat data tenant")
		return
	}

	ba, err := tc.settingsService.AddBankAccount(c.Request.Context(), tenantID, &req, tenant.Tenant.SubscriptionPlan)
	if err != nil {
		switch err.(type) {
		case *service.PlanLimitError:
			response.Error(c, http.StatusForbidden, err.Error(), "PLAN_LIMIT_EXCEEDED", nil)
		case *service.ValidationError:
			response.ValidationError(c, err.Error(), nil)
		default:
			response.InternalError(c, "Gagal menambah akun bank")
		}
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data: model.BankAccountData{
			ID:                ba.ID,
			BankName:          ba.BankName,
			BankCode:          ba.BankCode,
			AccountNumber:     ba.AccountNumber,
			AccountHolderName: ba.AccountHolderName,
			IsPrimary:         ba.IsPrimary,
		},
	})
}

// DeleteBankAccount handles DELETE /api/v1/tenants/settings/bank-accounts/:id.
func (tc *TenantSettingsController) DeleteBankAccount(c *gin.Context) {
	if !requireAdminRole(c) {
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	if err := tc.settingsService.DeleteBankAccount(c.Request.Context(), id, tenantID); err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Bank account")
		default:
			response.InternalError(c, "Gagal menghapus akun bank")
		}
		return
	}

	response.Success(c, gin.H{"message": "Akun bank berhasil dihapus"})
}

// UploadQRIS handles POST /api/v1/tenants/settings/qris.
func (tc *TenantSettingsController) UploadQRIS(c *gin.Context) {
	if !requireAdminRole(c) {
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)
	data, contentType, err := extractFile(c)
	if err != nil {
		response.ValidationError(c, err.Error(), nil)
		return
	}

	result, err := tc.settingsService.UploadQRIS(c.Request.Context(), tenantID, data, contentType)
	if err != nil {
		handleStorageError(c, err)
		return
	}

	response.Success(c, model.UploadResponse{URL: result.URL, Key: result.Key})
}

// requireAdminRole checks that the current user is owner or admin. Returns false and writes 403 if not.
func requireAdminRole(c *gin.Context) bool {
	role := c.GetString(middleware.CtxUserRole)
	if role != "owner" && role != "admin" {
		response.Forbidden(c, "Hanya owner atau admin yang dapat mengubah pengaturan")
		return false
	}
	return true
}

// buildSettingsResponse maps a SettingsResult to the SettingsResponse DTO.
func buildSettingsResponse(r *service.SettingsResult) model.SettingsResponse {
	t := r.Tenant

	var branding interface{}
	if len(t.Branding) > 0 {
		_ = json.Unmarshal(t.Branding, &branding)
	}

	var subscriptionExpiresAt *string
	if t.SubscriptionExpiresAt != nil {
		s := t.SubscriptionExpiresAt.Format("2006-01-02T15:04:05Z07:00")
		subscriptionExpiresAt = &s
	}

	bankAccounts := make([]model.BankAccountData, len(r.BankAccounts))
	for i, ba := range r.BankAccounts {
		bankAccounts[i] = model.BankAccountData{
			ID:                ba.ID,
			BankName:          ba.BankName,
			BankCode:          ba.BankCode,
			AccountNumber:     ba.AccountNumber,
			AccountHolderName: ba.AccountHolderName,
			IsPrimary:         ba.IsPrimary,
		}
	}

	var qris *model.QRISData
	if r.QRIS != nil {
		qd := &model.QRISData{
			ID:           r.QRIS.ID,
			QrisImageURL: r.QRIS.QrisImageURL,
			IsActive:     r.QRIS.IsActive,
		}
		if r.QRIS.QrisNMID != nil {
			qd.QrisNMID = *r.QRIS.QrisNMID
		}
		qris = qd
	}

	return model.SettingsResponse{
		ID:                      t.ID,
		Slug:                    t.Slug,
		Name:                    t.Name,
		Email:                   t.Email,
		Phone:                   t.Phone,
		Address:                 t.Address,
		City:                    t.City,
		Province:                t.Province,
		PostalCode:              t.PostalCode,
		NPWP:                    t.NPWP,
		BusinessType:            t.BusinessType,
		LogoURL:                 t.LogoURL,
		SubscriptionPlan:        t.SubscriptionPlan,
		SubscriptionExpiresAt:   subscriptionExpiresAt,
		InvoicePrefix:           t.InvoicePrefix,
		InvoiceFormat:           t.InvoiceFormat,
		QuotationPrefix:         t.QuotationPrefix,
		CreditNotePrefix:        t.CreditNotePrefix,
		DefaultCurrency:         t.DefaultCurrency,
		DefaultPaymentTermsDays: t.DefaultPaymentTermsDays,
		DefaultNotes:            t.DefaultNotes,
		DefaultTerms:            t.DefaultTerms,
		PPNEnabled:              t.PPNEnabled,
		PPNRate:                 t.PPNRate,
		Branding:                branding,
		BankAccounts:            bankAccounts,
		QRIS:                    qris,
		CreatedAt:               t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:               t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
