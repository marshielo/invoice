package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// AuthController handles auth-related endpoints.
type AuthController struct {
	authService *service.AuthService
}

// NewAuthController creates a new AuthController.
func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

// GetMe handles GET /api/v1/auth/me.
// Returns the authenticated user's info and tenant context.
func (a *AuthController) GetMe(c *gin.Context) {
	userID := c.GetString(middleware.CtxUserID)
	userEmail := c.GetString(middleware.CtxUserEmail)

	result, err := a.authService.GetMe(c.Request.Context(), userID, userEmail)
	if err != nil {
		response.InternalError(c, "Gagal memuat data pengguna")
		return
	}

	resp := model.AuthMeResponse{
		ID:        result.ID,
		Email:     result.Email,
		HasTenant: result.HasTenant,
	}

	if result.HasTenant {
		resp.FullName = result.FullName
		resp.AvatarURL = result.AvatarURL
		resp.Role = result.Role
		resp.Locale = result.Locale

		if result.Tenant != nil {
			resp.Tenant = &model.TenantSummary{
				ID:               result.Tenant.ID,
				Slug:             result.Tenant.Slug,
				Name:             result.Tenant.Name,
				SubscriptionPlan: result.Tenant.SubscriptionPlan,
				LogoURL:          result.Tenant.LogoURL,
			}
		}
	}

	response.Success(c, resp)
}

// Logout handles POST /api/v1/auth/logout.
// Supabase auth is JWT-based; actual logout is client-side.
// This endpoint exists as a server-side hook for future audit/blocklist use.
func (a *AuthController) Logout(c *gin.Context) {
	response.Success(c, gin.H{"message": "Berhasil keluar"})
}
