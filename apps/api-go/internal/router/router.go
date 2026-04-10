package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/controller"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/supabase"
)

// Deps holds all dependencies needed to build the router.
type Deps struct {
	SupabaseClient           *supabase.Client
	HealthController         *controller.HealthController
	AuthController           *controller.AuthController
	TenantController         *controller.TenantController
	TenantSettingsController *controller.TenantSettingsController
	UploadController         *controller.UploadController
	UserRepository           *repository.UserRepository
}

// New creates and configures the Gin router with all routes and middleware.
func New(deps Deps) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(gin.Logger())
	r.Use(middleware.ErrorHandler())
	r.Use(middleware.CORSMiddleware())

	// 404 handler
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, model.APIResponse{
			Success: false,
			Error:   "Endpoint tidak ditemukan",
			Code:    "NOT_FOUND",
		})
	})

	// -------------------------------------------------------
	// Health check (no auth)
	// -------------------------------------------------------
	r.GET("/health", deps.HealthController.GetHealth)

	// -------------------------------------------------------
	// API v1
	// -------------------------------------------------------
	api := r.Group("/api/v1")
	api.Use(middleware.APIRateLimit)

	authMW := middleware.AuthMiddleware(deps.SupabaseClient)
	tenantMW := middleware.TenantMiddleware(deps.UserRepository)

	// --- Auth ---
	auth := api.Group("/auth")
	auth.Use(middleware.AuthRateLimit)
	{
		auth.GET("/me", authMW, deps.AuthController.GetMe)
		auth.POST("/logout", authMW, deps.AuthController.Logout)
	}

	// --- Tenants ---
	tenants := api.Group("/tenants")
	{
		// POST /tenants — create tenant (auth only, no existing tenant)
		tenants.POST("/", authMW, deps.TenantController.CreateTenant)

		// GET /tenants/me — full tenant info (auth + tenant required)
		tenants.GET("/me", authMW, tenantMW, deps.TenantController.GetTenantMe)

		// --- Tenant Settings (all require auth + tenant) ---
		settings := tenants.Group("/settings")
		settings.Use(authMW)
		settings.Use(tenantMW)
		{
			settings.GET("", deps.TenantSettingsController.GetSettings)
			settings.PATCH("", deps.TenantSettingsController.UpdateSettings)
			settings.POST("/logo", deps.TenantSettingsController.UploadLogo)
			settings.POST("/qris", deps.TenantSettingsController.UploadQRIS)

			// Bank accounts
			ba := settings.Group("/bank-accounts")
			{
				ba.GET("", deps.TenantSettingsController.GetBankAccounts)
				ba.POST("", deps.TenantSettingsController.AddBankAccount)
				ba.DELETE("/:id", deps.TenantSettingsController.DeleteBankAccount)
			}
		}
	}

	// --- Upload (generic file uploads) ---
	upload := api.Group("/upload")
	upload.Use(authMW)
	upload.Use(tenantMW)
	{
		upload.POST("/logo", deps.UploadController.UploadLogo)
		upload.POST("/qris", deps.UploadController.UploadQris)
		upload.POST("/payment-proof/:paymentId", deps.UploadController.UploadPaymentProof)
		upload.DELETE("/:encodedKey", deps.UploadController.DeleteFile)
	}

	return r
}
