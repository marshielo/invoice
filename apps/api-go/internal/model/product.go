package model

import "time"

// Product represents the products table.
type Product struct {
	ID          string    `json:"id" db:"id"`
	TenantID    string    `json:"tenant_id" db:"tenant_id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description,omitempty" db:"description"`
	Unit        *string   `json:"unit,omitempty" db:"unit"`
	Price       string    `json:"price" db:"price"` // numeric stored as string to preserve precision
	ProductType string    `json:"product_type" db:"product_type"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// CreateProductRequest is the body for POST /api/v1/products.
type CreateProductRequest struct {
	Name        string  `json:"name" binding:"required,min=1,max=255"`
	Description *string `json:"description"`
	Unit        *string `json:"unit"`
	Price       float64 `json:"price"`
	ProductType string  `json:"product_type" binding:"omitempty,oneof=product service"`
	IsActive    *bool   `json:"is_active"`
}

// UpdateProductRequest is the body for PATCH /api/v1/products/:id.
type UpdateProductRequest struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	Unit        *string  `json:"unit"`
	Price       *float64 `json:"price"`
	ProductType *string  `json:"product_type" binding:"omitempty,oneof=product service"`
	IsActive    *bool    `json:"is_active"`
}

// ProductData is the DTO returned in API responses.
type ProductData struct {
	ID          string  `json:"id"`
	TenantID    string  `json:"tenantId"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Unit        *string `json:"unit"`
	Price       string  `json:"price"`
	ProductType string  `json:"productType"`
	IsActive    bool    `json:"isActive"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

// ProductsListResponse is returned by GET /api/v1/products.
type ProductsListResponse struct {
	Data  []ProductData `json:"data"`
	Total int           `json:"total"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}
