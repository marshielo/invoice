package model

import "time"

// User represents the users table.
type User struct {
	ID          string     `json:"id" db:"id"`
	TenantID    string     `json:"tenant_id" db:"tenant_id"`
	Email       string     `json:"email" db:"email"`
	FullName    string     `json:"full_name" db:"full_name"`
	Phone       *string    `json:"phone,omitempty" db:"phone"`
	AvatarURL   *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Role        string     `json:"role" db:"role"`
	Locale      string     `json:"locale" db:"locale"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// UserWithTenant is a user joined with its tenant.
type UserWithTenant struct {
	User
	Tenant *Tenant `json:"tenant,omitempty"`
}
