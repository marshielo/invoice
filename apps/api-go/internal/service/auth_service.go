package service

import (
	"context"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
)

// AuthService handles auth-related business logic.
type AuthService struct {
	userRepo *repository.UserRepository
}

// NewAuthService creates a new AuthService.
func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

// GetMeResult is the result of the GetMe operation.
type GetMeResult struct {
	ID        string
	Email     string
	FullName  string
	AvatarURL *string
	Role      string
	Locale    string
	HasTenant bool
	Tenant    *model.Tenant
}

// GetMe returns the user's auth context.
// If the user has no DB record (pre-onboarding), HasTenant is false.
func (s *AuthService) GetMe(ctx context.Context, userID, userEmail string) (*GetMeResult, error) {
	user, err := s.userRepo.FindByIDWithTenant(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	// User authenticated via Supabase but hasn't completed onboarding yet
	if user == nil {
		return &GetMeResult{
			ID:        userID,
			Email:     userEmail,
			HasTenant: false,
		}, nil
	}

	result := &GetMeResult{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		AvatarURL: user.AvatarURL,
		Role:      user.Role,
		Locale:    user.Locale,
		HasTenant: user.Tenant != nil,
		Tenant:    user.Tenant,
	}

	return result, nil
}
