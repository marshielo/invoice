package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/invoicein/api-go/internal/repository"
)

// StorageService handles file storage business logic.
type StorageService struct {
	storageRepo *repository.StorageRepository
}

// NewStorageService creates a new StorageService.
func NewStorageService(storageRepo *repository.StorageRepository) *StorageService {
	return &StorageService{storageRepo: storageRepo}
}

// UploadResult holds the URL and key of a successfully uploaded file.
type UploadResult struct {
	URL string
	Key string
}

// UploadLogo uploads a tenant logo image to R2.
func (s *StorageService) UploadLogo(ctx context.Context, tenantID string, data []byte, contentType string) (*UploadResult, error) {
	limit := repository.UploadLimits["logo"]
	if err := repository.ValidateUpload(contentType, int64(len(data)), limit); err != nil {
		return nil, &ValidationError{Message: err.Error()}
	}
	ext := repository.ExtFromContentType(contentType)
	key := repository.StorageKeys.TenantLogo(tenantID, ext)
	url, err := s.storageRepo.Upload(ctx, key, data, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload logo: %w", err)
	}
	return &UploadResult{URL: url, Key: key}, nil
}

// UploadQris uploads a QRIS image to R2.
func (s *StorageService) UploadQris(ctx context.Context, tenantID string, data []byte, contentType string) (*UploadResult, error) {
	limit := repository.UploadLimits["qris"]
	if err := repository.ValidateUpload(contentType, int64(len(data)), limit); err != nil {
		return nil, &ValidationError{Message: err.Error()}
	}
	ext := repository.ExtFromContentType(contentType)
	key := repository.StorageKeys.TenantQris(tenantID, ext)
	url, err := s.storageRepo.Upload(ctx, key, data, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload QRIS: %w", err)
	}
	return &UploadResult{URL: url, Key: key}, nil
}

// UploadPaymentProof uploads a payment proof file to R2.
func (s *StorageService) UploadPaymentProof(ctx context.Context, tenantID, paymentID string, data []byte, contentType string) (*UploadResult, error) {
	limit := repository.UploadLimits["payment_proof"]
	if err := repository.ValidateUpload(contentType, int64(len(data)), limit); err != nil {
		return nil, &ValidationError{Message: err.Error()}
	}
	ext := repository.ExtFromContentType(contentType)
	key := repository.StorageKeys.PaymentProof(tenantID, paymentID, ext)
	url, err := s.storageRepo.Upload(ctx, key, data, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload payment proof: %w", err)
	}
	return &UploadResult{URL: url, Key: key}, nil
}

// DeleteFile deletes a file from R2 after verifying it belongs to the tenant.
func (s *StorageService) DeleteFile(ctx context.Context, tenantID, key string) error {
	// Security: key must belong to this tenant
	if !containsTenantID(key, tenantID) {
		return &ValidationError{Message: "Tidak dapat menghapus file milik tenant lain"}
	}
	if err := s.storageRepo.Delete(ctx, key); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

func containsTenantID(key, tenantID string) bool {
	// R2 keys always include /{tenantID}/ as a path segment
	return len(key) > 0 && strings.Contains(key, "/"+tenantID+"/")
}

// ValidationError indicates invalid input.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }
