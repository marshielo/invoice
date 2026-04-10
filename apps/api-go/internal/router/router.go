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
	SupabaseClient    *supabase.Client
	HealthController  *controller.HealthController
	AuthController    *controller.AuthController
	TenantController  *controller.TenantController
	UploadController  *controller.UploadController
	UserRepository    *repository.UserRepository
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

	// --- Auth ---
	auth := api.Group("/auth")
	auth.Use(middleware.AuthRateLimit)
	{
		authMiddleware := middleware.AuthMiddleware(deps.SupabaseClient)
		auth.GET("/me", authMiddleware, deps.AuthController.GetMe)
		auth.POST("/logout", authMiddleware, deps.AuthController.Logout)
	}

	// --- Tenants ---
	tenants := api.Group("/tenants")
	{
		authMiddleware := middleware.AuthMiddleware(deps.SupabaseClient)
		tenantMiddleware := middleware.TenantMiddleware(deps.UserRepository)

		// POST /tenants requires auth but NOT tenant (user is creating one)
		tenants.POST("/", authMiddleware, deps.TenantController.CreateTenant)

		// GET /tenants/me requires both auth AND existing tenant
		tenants.GET("/me", authMiddleware, tenantMiddleware, deps.TenantController.GetTenantMe)
	}

	// --- Upload ---
	upload := api.Group("/upload")
	{
		authMiddleware := middleware.AuthMiddleware(deps.SupabaseClient)
		tenantMiddleware := middleware.TenantMiddleware(deps.UserRepository)

		upload.Use(authMiddleware)
		upload.Use(tenantMiddleware)

		upload.POST("/logo", deps.UploadController.UploadLogo)
		upload.POST("/qris", deps.UploadController.UploadQris)
		upload.POST("/payment-proof/:paymentId", deps.UploadController.UploadPaymentProof)
		upload.DELETE("/:encodedKey", deps.UploadController.DeleteFile)
	}

	return r
}
