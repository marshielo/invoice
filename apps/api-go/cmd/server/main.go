package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	appconfig "github.com/invoicein/api-go/internal/config"
	"github.com/invoicein/api-go/internal/controller"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/internal/router"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/anthropic"
	"github.com/invoicein/api-go/pkg/fonnte"
	"github.com/invoicein/api-go/pkg/midtrans"
	"github.com/invoicein/api-go/pkg/supabase"
	customvalidator "github.com/invoicein/api-go/pkg/validator"
)

func main() {
	// 0. Load .env file in development (no-op in production where env vars are injected)
	_ = godotenv.Load()

	// 1. Load configuration
	cfg, err := appconfig.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// 2. Set Gin mode
	if !cfg.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}

	// 3. Connect to PostgreSQL (Supabase)
	// Use simple_protocol to avoid pgx v5 prepared-statement cache conflicts
	// (SQLSTATE 42P05 "prepared statement already exists") on Supabase's
	// PgBouncer connection pool, which reuses backend sessions.
	dbURL := cfg.DatabaseURL
	if strings.Contains(dbURL, "?") {
		dbURL += "&default_query_exec_mode=simple_protocol"
	} else {
		dbURL += "?default_query_exec_mode=simple_protocol"
	}
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	log.Println("✅ Database connected")

	// 4. Wire up Supabase client
	sb := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey, cfg.SupabaseJWTSecret)

	// 5. Wire up R2 storage repository
	storageRepo, err := repository.NewStorageRepository(cfg)
	if err != nil {
		log.Fatalf("failed to initialize storage: %v", err)
	}

	// 6. Wire repositories
	tenantRepo := repository.NewTenantRepository(db)
	userRepo := repository.NewUserRepository(db)
	clientRepo := repository.NewClientRepository(db)
	productRepo := repository.NewProductRepository(db)
	invoiceRepo := repository.NewInvoiceRepository(db)
	midtransRepo := repository.NewMidtransRepository(db)

	// 7. Wire Anthropic client
	anthropicClient := anthropic.NewClient(cfg.AnthropicAPIKey)

	// 7b. Wire Fonnte client (optional — nil if API key not set)
	var fonnteClient *fonnte.Client
	if cfg.FonnteAPIKey != "" {
		fonnteClient = fonnte.NewClient(cfg.FonnteAPIKey)
	}

	// 7c. Wire Midtrans client
	midtransClient := midtrans.NewClient(cfg.MidtransServerKey, cfg.MidtransIsProd)

	// 8. Wire services
	authService := service.NewAuthService(userRepo)
	tenantService := service.NewTenantService(tenantRepo, userRepo, db, sb)
	tenantSettingsService := service.NewTenantSettingsService(tenantRepo, storageRepo)
	userService := service.NewUserService(userRepo, sb)
	storageService := service.NewStorageService(storageRepo)
	clientService := service.NewClientService(clientRepo)
	productService := service.NewProductService(productRepo)
	invoiceService := service.NewInvoiceService(invoiceRepo)
	invoicePDFService := service.NewInvoicePDFService(invoiceRepo, tenantRepo, storageRepo)
	aiService := service.NewAIService(anthropicClient, tenantRepo, clientRepo, productRepo)
	var whatsappService *service.WhatsAppService
	if fonnteClient != nil {
		whatsappService = service.NewWhatsAppService(fonnteClient, invoiceRepo, invoicePDFService)
	}
	midtransService := service.NewMidtransService(midtransRepo, invoiceRepo, midtransClient)

	// 9. Wire controllers
	healthCtrl := controller.NewHealthController(cfg.Environment)
	authCtrl := controller.NewAuthController(authService)
	tenantCtrl := controller.NewTenantController(tenantService)
	tenantSettingsCtrl := controller.NewTenantSettingsController(tenantSettingsService, tenantService)
	userCtrl := controller.NewUserController(userService, tenantSettingsService)
	uploadCtrl := controller.NewUploadController(storageService)
	clientCtrl := controller.NewClientController(clientService)
	productCtrl := controller.NewProductController(productService)
	invoiceCtrl := controller.NewInvoiceController(invoiceService, invoicePDFService, whatsappService)
	aiCtrl := controller.NewAIController(aiService)
	midtransCtrl := controller.NewMidtransController(midtransService)

	// 10. Register custom validators
	customvalidator.RegisterCustomValidators()

	// 11. Build router
	r := router.New(router.Deps{
		SupabaseClient:           sb,
		HealthController:         healthCtrl,
		AuthController:           authCtrl,
		TenantController:         tenantCtrl,
		TenantSettingsController: tenantSettingsCtrl,
		UserController:           userCtrl,
		UploadController:         uploadCtrl,
		ClientController:         clientCtrl,
		ProductController:        productCtrl,
		InvoiceController:        invoiceCtrl,
		AIController:             aiCtrl,
		MidtransController:       midtransCtrl,
		UserRepository:           userRepo,
	})

	// 12. Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Invoicein API (Go) starting on %s [%s]", addr, cfg.Environment)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
