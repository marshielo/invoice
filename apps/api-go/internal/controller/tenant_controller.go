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

// TenantController handles tenant-related endpoints.
type TenantController struct {
	tenantService *service.TenantService
}

// NewTenantController creates a new TenantController.
func NewTenantController(tenantService *service.TenantService) *TenantController {
	return &TenantController{tenantService: tenantService}
}

// CreateTenant handles POST /api/v1/tenants.
func (t *TenantController) CreateTenant(c *gin.Context) {
	var req model.CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	userID := c.GetString(middleware.CtxUserID)
	userEmail := c.GetString(middleware.CtxUserEmail)

	result, err := t.tenantService.CreateTenant(c.Request.Context(), service.CreateTenantInput{
		Name:            req.Name,
		Slug:            req.Slug,
		BusinessType:    req.BusinessType,
		Email:           req.Email,
		Phone:           req.Phone,
		Address:         req.Address,
		City:            req.City,
		Province:        req.Province,
		PostalCode:      req.PostalCode,
		CreatorID:       userID,
		CreatorEmail:    userEmail,
		CreatorFullName: req.FullName,
	})
	if err != nil {
		switch e := err.(type) {
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		default:
			response.InternalError(c, "Gagal membuat tenant")
		}
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data: model.CreateTenantResponse{
			Tenant: model.CreatedTenantData{
				ID:               result.Tenant.ID,
				Slug:             result.Tenant.Slug,
				Name:             result.Tenant.Name,
				Email:            result.Tenant.Email,
				Phone:            result.Tenant.Phone,
				BusinessType:     result.Tenant.BusinessType,
				SubscriptionPlan: result.Tenant.SubscriptionPlan,
				CreatedAt:        result.Tenant.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			},
			User: model.CreatedUserData{
				ID:       result.User.ID,
				Email:    result.User.Email,
				FullName: result.User.FullName,
				Role:     result.User.Role,
			},
		},
	})
}

// GetTenantMe handles GET /api/v1/tenants/me.
func (t *TenantController) GetTenantMe(c *gin.Context) {
	userID := c.GetString(middleware.CtxUserID)

	tenant, err := t.tenantService.GetTenantByUserID(c.Request.Context(), userID)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Tenant")
		default:
			response.InternalError(c, "Gagal memuat data tenant")
		}
		return
	}

	// Build bank accounts slice
	bankAccounts := make([]model.BankAccountData, len(tenant.BankAccounts))
	for i, ba := range tenant.BankAccounts {
		bankAccounts[i] = model.BankAccountData{
			ID:                ba.ID,
			BankName:          ba.BankName,
			BankCode:          ba.BankCode,
			AccountNumber:     ba.AccountNumber,
			AccountHolderName: ba.AccountHolderName,
			IsPrimary:         ba.IsPrimary,
		}
	}

	// Parse branding JSONB
	var branding interface{}
	if len(tenant.Branding) > 0 {
		_ = json.Unmarshal(tenant.Branding, &branding)
	}

	var subscriptionExpiresAt *string
	if tenant.SubscriptionExpiresAt != nil {
		s := tenant.SubscriptionExpiresAt.Format("2006-01-02T15:04:05Z07:00")
		subscriptionExpiresAt = &s
	}

	response.Success(c, model.TenantMeResponse{
		ID:                      tenant.ID,
		Slug:                    tenant.Slug,
		Name:                    tenant.Name,
		Email:                   tenant.Email,
		Phone:                   tenant.Phone,
		Address:                 tenant.Address,
		City:                    tenant.City,
		Province:                tenant.Province,
		PostalCode:              tenant.PostalCode,
		NPWP:                    tenant.NPWP,
		BusinessType:            tenant.BusinessType,
		LogoURL:                 tenant.LogoURL,
		SubscriptionPlan:        tenant.SubscriptionPlan,
		SubscriptionExpiresAt:   subscriptionExpiresAt,
		InvoicePrefix:           tenant.InvoicePrefix,
		InvoiceFormat:           tenant.InvoiceFormat,
		QuotationPrefix:         tenant.QuotationPrefix,
		DefaultCurrency:         tenant.DefaultCurrency,
		DefaultPaymentTermsDays: tenant.DefaultPaymentTermsDays,
		DefaultNotes:            tenant.DefaultNotes,
		DefaultTerms:            tenant.DefaultTerms,
		PPNEnabled:              tenant.PPNEnabled,
		PPNRate:                 tenant.PPNRate,
		Branding:                branding,
		BankAccounts:            bankAccounts,
		CreatedAt:               tenant.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:               tenant.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// formatBindingErrors converts gin binding errors to a map of field -> messages.
func formatBindingErrors(err error) map[string][]string {
	details := map[string][]string{
		"error": {err.Error()},
	}
	return details
}
