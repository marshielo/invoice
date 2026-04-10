package model

// CreateTenantRequest is the request body for POST /api/v1/tenants.
type CreateTenantRequest struct {
	Name         string  `json:"name" binding:"required,min=2,max=255"`
	Slug         string  `json:"slug" binding:"required,min=3,max=63,slug"`
	BusinessType string  `json:"businessType" binding:"required,oneof=florist freelancer workshop retail food_beverage fashion service other"`
	Email        string  `json:"email" binding:"required,email"`
	Phone        *string `json:"phone,omitempty" binding:"omitempty,min=8,max=20"`
	Address      *string `json:"address,omitempty" binding:"omitempty,max=500"`
	City         *string `json:"city,omitempty" binding:"omitempty,max=100"`
	Province     *string `json:"province,omitempty" binding:"omitempty,max=100"`
	PostalCode   *string `json:"postalCode,omitempty" binding:"omitempty,max=10"`
	FullName     string  `json:"fullName" binding:"required,min=1,max=255"`
}
