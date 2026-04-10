package model

import "time"

// Client represents the clients table.
type Client struct {
	ID         string     `json:"id" db:"id"`
	TenantID   string     `json:"tenant_id" db:"tenant_id"`
	Name       string     `json:"name" db:"name"`
	Email      *string    `json:"email,omitempty" db:"email"`
	Phone      *string    `json:"phone,omitempty" db:"phone"`
	Address    *string    `json:"address,omitempty" db:"address"`
	City       *string    `json:"city,omitempty" db:"city"`
	Province   *string    `json:"province,omitempty" db:"province"`
	PostalCode *string    `json:"postal_code,omitempty" db:"postal_code"`
	NPWP       *string    `json:"npwp,omitempty" db:"npwp"`
	Notes      *string    `json:"notes,omitempty" db:"notes"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateClientRequest is the body for POST /api/v1/clients.
type CreateClientRequest struct {
	Name       string  `json:"name" binding:"required,min=1,max=255"`
	Email      *string `json:"email"`
	Phone      *string `json:"phone"`
	Address    *string `json:"address"`
	City       *string `json:"city"`
	Province   *string `json:"province"`
	PostalCode *string `json:"postal_code"`
	NPWP       *string `json:"npwp"`
	Notes      *string `json:"notes"`
}

// UpdateClientRequest is the body for PATCH /api/v1/clients/:id.
type UpdateClientRequest struct {
	Name       *string `json:"name"`
	Email      *string `json:"email"`
	Phone      *string `json:"phone"`
	Address    *string `json:"address"`
	City       *string `json:"city"`
	Province   *string `json:"province"`
	PostalCode *string `json:"postal_code"`
	NPWP       *string `json:"npwp"`
	Notes      *string `json:"notes"`
}

// ClientData is the DTO returned in API responses.
type ClientData struct {
	ID         string  `json:"id"`
	TenantID   string  `json:"tenantId"`
	Name       string  `json:"name"`
	Email      *string `json:"email"`
	Phone      *string `json:"phone"`
	Address    *string `json:"address"`
	City       *string `json:"city"`
	Province   *string `json:"province"`
	PostalCode *string `json:"postalCode"`
	NPWP       *string `json:"npwp"`
	Notes      *string `json:"notes"`
	CreatedAt  string  `json:"createdAt"`
	UpdatedAt  string  `json:"updatedAt"`
}

// ClientsListResponse is returned by GET /api/v1/clients.
type ClientsListResponse struct {
	Data   []ClientData `json:"data"`
	Total  int          `json:"total"`
	Page   int          `json:"page"`
	Limit  int          `json:"limit"`
}
