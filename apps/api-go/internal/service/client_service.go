package service

import (
	"context"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
)

// ClientService handles client business logic.
type ClientService struct {
	repo *repository.ClientRepository
}

// NewClientService creates a new ClientService.
func NewClientService(repo *repository.ClientRepository) *ClientService {
	return &ClientService{repo: repo}
}

// ListClients returns a paginated list of clients for a tenant.
func (s *ClientService) ListClients(ctx context.Context, tenantID, search string, page, limit int) ([]model.Client, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.repo.List(ctx, tenantID, search, page, limit)
}

// CreateClient creates a new client.
func (s *ClientService) CreateClient(ctx context.Context, tenantID string, req *model.CreateClientRequest) (*model.Client, error) {
	c := &model.Client{
		TenantID:   tenantID,
		Name:       req.Name,
		Email:      req.Email,
		Phone:      req.Phone,
		Address:    req.Address,
		City:       req.City,
		Province:   req.Province,
		PostalCode: req.PostalCode,
		NPWP:       req.NPWP,
		Notes:      req.Notes,
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}
	return c, nil
}

// GetClient returns a single client by ID.
func (s *ClientService) GetClient(ctx context.Context, id, tenantID string) (*model.Client, error) {
	c, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch client: %w", err)
	}
	if c == nil {
		return nil, &NotFoundError{Resource: "Client"}
	}
	return c, nil
}

// UpdateClient applies a partial update to a client.
func (s *ClientService) UpdateClient(ctx context.Context, id, tenantID string, req *model.UpdateClientRequest) (*model.Client, error) {
	fields := map[string]interface{}{}
	if req.Name != nil { fields["name"] = *req.Name }
	if req.Email != nil { fields["email"] = *req.Email }
	if req.Phone != nil { fields["phone"] = *req.Phone }
	if req.Address != nil { fields["address"] = *req.Address }
	if req.City != nil { fields["city"] = *req.City }
	if req.Province != nil { fields["province"] = *req.Province }
	if req.PostalCode != nil { fields["postal_code"] = *req.PostalCode }
	if req.NPWP != nil { fields["npwp"] = *req.NPWP }
	if req.Notes != nil { fields["notes"] = *req.Notes }

	c, err := s.repo.Update(ctx, id, tenantID, fields)
	if err != nil {
		return nil, fmt.Errorf("failed to update client: %w", err)
	}
	if c == nil {
		return nil, &NotFoundError{Resource: "Client"}
	}
	return c, nil
}

// DeleteClient deletes a client, returning ConflictError if it has invoices.
func (s *ClientService) DeleteClient(ctx context.Context, id, tenantID string) error {
	// Check existence first
	c, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("failed to fetch client: %w", err)
	}
	if c == nil {
		return &NotFoundError{Resource: "Client"}
	}

	// Guard: prevent deleting a client with invoices
	has, err := s.repo.HasInvoices(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to check invoices: %w", err)
	}
	if has {
		return &ConflictError{Message: "Client memiliki invoice yang masih aktif dan tidak dapat dihapus"}
	}

	ok, err := s.repo.Delete(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("failed to delete client: %w", err)
	}
	if !ok {
		return &NotFoundError{Resource: "Client"}
	}
	return nil
}
