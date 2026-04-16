package service

import (
	"context"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
)

// ProductService handles product business logic.
type ProductService struct {
	repo *repository.ProductRepository
}

// NewProductService creates a new ProductService.
func NewProductService(repo *repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

// ListProducts returns a paginated list of products for a tenant.
func (s *ProductService) ListProducts(ctx context.Context, tenantID, search, productType string, activeOnly bool, page, limit int) ([]model.Product, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.repo.List(ctx, tenantID, search, productType, activeOnly, page, limit)
}

// CreateProduct creates a new product.
func (s *ProductService) CreateProduct(ctx context.Context, tenantID string, req *model.CreateProductRequest) (*model.Product, error) {
	productType := req.ProductType
	if productType == "" {
		productType = "product"
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	p := &model.Product{
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		Unit:        req.Unit,
		Price:       fmt.Sprintf("%.2f", req.Price),
		ProductType: productType,
		IsActive:    isActive,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, fmt.Errorf("failed to create product: %w", err)
	}
	return p, nil
}

// GetProduct returns a single product by ID.
func (s *ProductService) GetProduct(ctx context.Context, id, tenantID string) (*model.Product, error) {
	p, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch product: %w", err)
	}
	if p == nil {
		return nil, &NotFoundError{Resource: "Product"}
	}
	return p, nil
}

// UpdateProduct applies a partial update to a product.
func (s *ProductService) UpdateProduct(ctx context.Context, id, tenantID string, req *model.UpdateProductRequest) (*model.Product, error) {
	fields := map[string]interface{}{}
	if req.Name != nil { fields["name"] = *req.Name }
	if req.Description != nil { fields["description"] = *req.Description }
	if req.Unit != nil { fields["unit"] = *req.Unit }
	if req.Price != nil { fields["price"] = fmt.Sprintf("%.2f", *req.Price) }
	if req.ProductType != nil { fields["product_type"] = *req.ProductType }
	if req.IsActive != nil { fields["is_active"] = *req.IsActive }

	p, err := s.repo.Update(ctx, id, tenantID, fields)
	if err != nil {
		return nil, fmt.Errorf("failed to update product: %w", err)
	}
	if p == nil {
		return nil, &NotFoundError{Resource: "Product"}
	}
	return p, nil
}

// DeleteProduct deletes a product, returning ConflictError if used in invoice items.
func (s *ProductService) DeleteProduct(ctx context.Context, id, tenantID string) error {
	p, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("failed to fetch product: %w", err)
	}
	if p == nil {
		return &NotFoundError{Resource: "Product"}
	}

	has, err := s.repo.HasInvoiceItems(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to check invoice items: %w", err)
	}
	if has {
		return &ConflictError{Message: "Produk digunakan pada invoice dan tidak dapat dihapus"}
	}

	ok, err := s.repo.Delete(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("failed to delete product: %w", err)
	}
	if !ok {
		return &NotFoundError{Resource: "Product"}
	}
	return nil
}
