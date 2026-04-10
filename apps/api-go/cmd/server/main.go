package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	appconfig "github.com/invoicein/api-go/internal/config"
	"github.com/invoicein/api-go/internal/controller"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/internal/router"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/supabase"
	customvalidator "github.com/invoicein/api-go/pkg/validator"
)

func main() {
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
	db, err := sql.Open("pgx", cfg.DatabaseURL)
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

	// 7. Wire services
	authService := service.NewAuthService(userRepo)
	tenantService := service.NewTenantService(tenantRepo, userRepo, db, sb)
	tenantSettingsService := service.NewTenantSettingsService(tenantRepo, storageRepo)
	userService := service.NewUserService(userRepo, sb)
	storageService := service.NewStorageService(storageRepo)

	// 8. Wire controllers
	healthCtrl := controller.NewHealthController(cfg.Environment)
	authCtrl := controller.NewAuthController(authService)
	tenantCtrl := controller.NewTenantController(tenantService)
	tenantSettingsCtrl := controller.NewTenantSettingsController(tenantSettingsService, tenantService)
	userCtrl := controller.NewUserController(userService, tenantSettingsService)
	uploadCtrl := controller.NewUploadController(storageService)

	// 9. Register custom validators
	customvalidator.RegisterCustomValidators()

	// 10. Build router
	r := router.New(router.Deps{
		SupabaseClient:           sb,
		HealthController:         healthCtrl,
		AuthController:           authCtrl,
		TenantController:         tenantCtrl,
		TenantSettingsController: tenantSettingsCtrl,
		UserController:           userCtrl,
		UploadController:         uploadCtrl,
		UserRepository:           userRepo,
	})

	// 11. Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Invoicein API (Go) starting on %s [%s]", addr, cfg.Environment)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
