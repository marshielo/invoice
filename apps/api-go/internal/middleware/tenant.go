package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/response"
)

const (
	// Context keys set by tenant middleware
	CtxTenantID   = "tenantId"
	CtxTenantSlug = "tenantSlug"
	CtxUserRole   = "userRole"
)

// TenantMiddleware resolves the tenant context from the authenticated user.
// Must run AFTER AuthMiddleware.
func TenantMiddleware(userRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get(CtxUserID)
		if !exists {
			response.Unauthorized(c, "Autentikasi diperlukan")
			c.Abort()
			return
		}

		user, err := userRepo.FindByIDWithTenant(c.Request.Context(), userID.(string))
		if err != nil {
			response.NotFound(c, "User")
			c.Abort()
			return
		}

		if !user.IsActive {
			response.Unauthorized(c, "Akun Anda telah dinonaktifkan")
			c.Abort()
			return
		}

		if user.Tenant == nil {
			response.NotFound(c, "Tenant")
			c.Abort()
			return
		}

		c.Set(CtxTenantID, user.TenantID)
		c.Set(CtxTenantSlug, user.Tenant.Slug)
		c.Set(CtxUserRole, user.Role)
		c.Next()
	}
}
