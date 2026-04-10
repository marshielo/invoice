package service

import (
	"context"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/supabase"
)

// User plan limits: max active users per plan.
var userPlanLimits = map[string]int{
	"free":         1,
	"professional": 5,
	"business":     -1, // -1 = unlimited
}

// UserService handles user management business logic.
type UserService struct {
	userRepo *repository.UserRepository
	supabase *supabase.Client
}

// NewUserService creates a new UserService.
func NewUserService(userRepo *repository.UserRepository, sb *supabase.Client) *UserService {
	return &UserService{userRepo: userRepo, supabase: sb}
}

// ListUsers returns paginated users for a tenant.
func (s *UserService) ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]model.User, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.userRepo.ListByTenantID(ctx, tenantID, limit, offset)
}

// GetMe returns the current user's profile.
func (s *UserService) GetMe(ctx context.Context, userID, tenantID string) (*model.User, error) {
	user, err := s.userRepo.FindByTenantAndID(ctx, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	if user == nil {
		return nil, &NotFoundError{Resource: "User"}
	}
	return user, nil
}

// InviteUser sends a Supabase invite email, creates a pending user record.
// The inviting user must be owner or admin (enforced in controller).
func (s *UserService) InviteUser(ctx context.Context, tenantID, email, role, subscriptionPlan string) (*model.User, error) {
	// 1. Check plan user limit
	limit, ok := userPlanLimits[subscriptionPlan]
	if !ok {
		limit = userPlanLimits["free"]
	}

	if limit >= 0 {
		count, err := s.userRepo.CountActiveByTenantID(ctx, tenantID)
		if err != nil {
			return nil, fmt.Errorf("failed to count users: %w", err)
		}
		if count >= limit {
			return nil, &PlanLimitError{
				Message: fmt.Sprintf("Batas anggota tim untuk paket %s adalah %d pengguna. Upgrade untuk menambah lebih banyak.", subscriptionPlan, limit),
			}
		}
	}

	// 2. Check email uniqueness within tenant
	exists, err := s.userRepo.ExistsByEmail(ctx, email, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}
	if exists {
		return nil, &ConflictError{Message: fmt.Sprintf("Pengguna dengan email \"%s\" sudah ada di tim ini", email)}
	}

	// 3. Send Supabase Auth invite — this creates the auth user and emails a magic link
	supabaseUserID, err := s.supabase.InviteUserByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("failed to send invite: %w", err)
	}

	// 4. Create the DB user record (inactive until they accept the invite)
	user := &model.User{
		ID:       supabaseUserID,
		TenantID: tenantID,
		Email:    email,
		FullName: email, // placeholder until user sets their name post-onboarding
		Role:     role,
		Locale:   "id",
		IsActive: false, // becomes active when they accept invite and log in
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user record: %w", err)
	}

	// 5. Set app_metadata so their JWT has tenant context on first login
	if err := s.supabase.UpdateUserAppMetadata(supabaseUserID, map[string]interface{}{
		"tenant_id":   tenantID,
		"tenant_slug": "", // will be populated on first auth/me call
		"role":        role,
	}); err != nil {
		// Non-fatal warning
		fmt.Printf("[WARN] Failed to update invited user app_metadata %s: %v\n", supabaseUserID, err)
	}

	return user, nil
}

// UpdateRole changes a user's role. Owner role cannot be changed.
func (s *UserService) UpdateRole(ctx context.Context, targetID, tenantID, requesterRole, newRole string) (*model.User, error) {
	// 1. Fetch the target user
	target, err := s.userRepo.FindByTenantAndID(ctx, targetID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	if target == nil {
		return nil, &NotFoundError{Resource: "User"}
	}

	// 2. Cannot change the owner's role
	if target.Role == "owner" {
		return nil, &ForbiddenError{Message: "Role owner tidak dapat diubah"}
	}

	// 3. Admin can only manage staff/viewer, not other admins
	if requesterRole == "admin" && target.Role == "admin" {
		return nil, &ForbiddenError{Message: "Admin tidak dapat mengubah role admin lain"}
	}

	// 4. Apply update
	if err := s.userRepo.UpdateRole(ctx, targetID, tenantID, newRole); err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	target.Role = newRole
	return target, nil
}

// DeactivateUser soft-deletes a user and bans them in Supabase Auth.
func (s *UserService) DeactivateUser(ctx context.Context, targetID, tenantID, requesterID string) error {
	// 1. Prevent self-deactivation
	if targetID == requesterID {
		return &ForbiddenError{Message: "Tidak dapat menonaktifkan akun sendiri"}
	}

	// 2. Fetch target
	target, err := s.userRepo.FindByTenantAndID(ctx, targetID, tenantID)
	if err != nil {
		return fmt.Errorf("failed to fetch user: %w", err)
	}
	if target == nil {
		return &NotFoundError{Resource: "User"}
	}

	// 3. Cannot deactivate the owner
	if target.Role == "owner" {
		return &ForbiddenError{Message: "Owner tidak dapat dinonaktifkan"}
	}

	// 4. Soft-delete in DB
	if err := s.userRepo.Deactivate(ctx, targetID, tenantID); err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	// 5. Ban in Supabase Auth so they can't log in
	if err := s.supabase.BanUser(targetID); err != nil {
		// Non-fatal: DB record is deactivated, Supabase ban failed
		fmt.Printf("[WARN] Failed to ban user %s in Supabase: %v\n", targetID, err)
	}

	return nil
}

// ForbiddenError indicates the caller lacks permission for the action.
type ForbiddenError struct {
	Message string
}

func (e *ForbiddenError) Error() string { return e.Message }
