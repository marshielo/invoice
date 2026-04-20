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
	UserController           *controller.UserController
	UploadController         *controller.UploadController
	ClientController         *controller.ClientController
	ProductController        *controller.ProductController
	InvoiceController        *controller.InvoiceController
	AIController             *controller.AIController
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

	// --- Users ---
	users := api.Group("/users")
	users.Use(authMW)
	users.Use(tenantMW)
	{
		users.GET("", deps.UserController.ListUsers)
		users.GET("/me", deps.UserController.GetMe)
		users.POST("/invite", deps.UserController.InviteUser)
		users.PATCH("/:id", deps.UserController.UpdateRole)
		users.DELETE("/:id", deps.UserController.DeactivateUser)
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

	// --- Clients ---
	clients := api.Group("/clients")
	clients.Use(authMW)
	clients.Use(tenantMW)
	{
		clients.GET("", deps.ClientController.ListClients)
		clients.POST("", deps.ClientController.CreateClient)
		clients.GET("/:id", deps.ClientController.GetClient)
		clients.PATCH("/:id", deps.ClientController.UpdateClient)
		clients.DELETE("/:id", deps.ClientController.DeleteClient)
	}

	// --- Products ---
	products := api.Group("/products")
	products.Use(authMW)
	products.Use(tenantMW)
	{
		products.GET("", deps.ProductController.ListProducts)
		products.POST("", deps.ProductController.CreateProduct)
		products.GET("/:id", deps.ProductController.GetProduct)
		products.PATCH("/:id", deps.ProductController.UpdateProduct)
		products.DELETE("/:id", deps.ProductController.DeleteProduct)
	}

	// --- Invoices ---
	invoices := api.Group("/invoices")
	invoices.Use(authMW)
	invoices.Use(tenantMW)
	{
		invoices.GET("", deps.InvoiceController.ListInvoices)
		invoices.POST("", deps.InvoiceController.CreateInvoice)
		invoices.GET("/:id", deps.InvoiceController.GetInvoice)
		invoices.PATCH("/:id", deps.InvoiceController.UpdateInvoice)
		invoices.DELETE("/:id", deps.InvoiceController.DeleteInvoice)
		invoices.POST("/:id/send", deps.InvoiceController.SendInvoice)
		invoices.POST("/:id/cancel", deps.InvoiceController.CancelInvoice)
		invoices.POST("/:id/pdf", deps.InvoiceController.GeneratePDF)
		invoices.POST("/:id/payments", deps.InvoiceController.CreatePayment)
		invoices.DELETE("/:id/payments/:payment_id", deps.InvoiceController.DeletePayment)
		invoices.POST("/:id/send-whatsapp", deps.InvoiceController.SendWhatsApp)
	}

	// --- AI ---
	ai := api.Group("/ai")
	ai.Use(authMW)
	ai.Use(tenantMW)
	ai.Use(middleware.AIRateLimit)
	{
		ai.POST("/generate-invoice", deps.AIController.GenerateInvoice)
	}

	return r
}
