package service

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/supabase"
)

// TenantService handles tenant business logic.
type TenantService struct {
	tenantRepo *repository.TenantRepository
	userRepo   *repository.UserRepository
	db         *sql.DB
	supabase   *supabase.Client
}

// NewTenantService creates a new TenantService.
func NewTenantService(
	tenantRepo *repository.TenantRepository,
	userRepo *repository.UserRepository,
	db *sql.DB,
	sb *supabase.Client,
) *TenantService {
	return &TenantService{
		tenantRepo: tenantRepo,
		userRepo:   userRepo,
		db:         db,
		supabase:   sb,
	}
}

// CreateTenantInput is the input for creating a new tenant.
type CreateTenantInput struct {
	Name         string
	Slug         string
	BusinessType string
	Email        string
	Phone        *string
	Address      *string
	City         *string
	Province     *string
	PostalCode   *string
	// Creator (Supabase Auth user)
	CreatorID       string
	CreatorEmail    string
	CreatorFullName string
}

// CreateTenantResult holds the created tenant and owner user.
type CreateTenantResult struct {
	Tenant *model.Tenant
	User   *model.User
}

// CreateTenant creates a new tenant + owner user in a single transaction,
// then updates the Supabase JWT app_metadata with the new tenant context.
func (s *TenantService) CreateTenant(ctx context.Context, input CreateTenantInput) (*CreateTenantResult, error) {
	// 1. Check slug uniqueness
	exists, err := s.tenantRepo.ExistsBySlug(ctx, input.Slug)
	if err != nil {
		return nil, fmt.Errorf("failed to check slug: %w", err)
	}
	if exists {
		return nil, &ConflictError{Message: fmt.Sprintf("Slug \"%s\" sudah digunakan oleh tenant lain", input.Slug)}
	}

	// 2. Run tenant + user creation in a transaction
	tx, err := s.tenantRepo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	tenant := &model.Tenant{
		Slug:         input.Slug,
		Name:         input.Name,
		Email:        input.Email,
		Phone:        input.Phone,
		Address:      input.Address,
		City:         input.City,
		Province:     input.Province,
		PostalCode:   input.PostalCode,
		BusinessType: input.BusinessType,
	}

	if err := s.tenantRepo.CreateTx(ctx, tx, tenant); err != nil {
		return nil, fmt.Errorf("failed to create tenant: %w", err)
	}

	user := &model.User{
		ID:       input.CreatorID,
		TenantID: tenant.ID,
		Email:    input.CreatorEmail,
		FullName: input.CreatorFullName,
		Role:     "owner",
		Locale:   "id",
		IsActive: true,
	}

	if err := s.userRepo.CreateTx(ctx, tx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// 3. Update Supabase JWT app_metadata so subsequent tokens have tenant context
	if err := s.supabase.UpdateUserAppMetadata(input.CreatorID, map[string]interface{}{
		"tenant_id":   tenant.ID,
		"tenant_slug": tenant.Slug,
		"role":        "owner",
	}); err != nil {
		// Non-fatal: tenant was created successfully, JWT will be stale until next login
		// Log but do not fail the request
		fmt.Printf("[WARN] Failed to update Supabase app_metadata for user %s: %v\n", input.CreatorID, err)
	}

	return &CreateTenantResult{Tenant: tenant, User: user}, nil
}

// GetTenantByUserID returns the tenant (with bank accounts) for the given user.
func (s *TenantService) GetTenantByUserID(ctx context.Context, userID string) (*model.TenantWithBankAccounts, error) {
	tenant, err := s.tenantRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tenant: %w", err)
	}
	if tenant == nil {
		return nil, &NotFoundError{Resource: "Tenant"}
	}
	return tenant, nil
}

// --- Domain errors ---

// ConflictError indicates a uniqueness constraint violation.
type ConflictError struct {
	Message string
}

func (e *ConflictError) Error() string { return e.Message }

// NotFoundError indicates a resource was not found.
type NotFoundError struct {
	Resource string
}

func (e *NotFoundError) Error() string { return e.Resource + " tidak ditemukan" }
