package repository

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	appconfig "github.com/invoicein/api-go/internal/config"
)

// StorageRepository handles Cloudflare R2 (S3-compatible) object storage.
type StorageRepository struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

// NewStorageRepository creates a new StorageRepository using Cloudflare R2 credentials.
func NewStorageRepository(cfg *appconfig.Config) (*StorageRepository, error) {
	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID)

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.R2AccessKeyID,
			cfg.R2SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	return &StorageRepository{
		client:    client,
		bucket:    cfg.R2BucketName,
		publicURL: strings.TrimRight(cfg.R2PublicURL, "/"),
	}, nil
}

// Upload stores an object in R2 and returns its public URL.
func (r *StorageRepository) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to R2: %w", err)
	}
	return r.PublicURL(key), nil
}

// Delete removes an object from R2.
func (r *StorageRepository) Delete(ctx context.Context, key string) error {
	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete from R2: %w", err)
	}
	return nil
}

// PublicURL returns the public URL for an R2 object key.
func (r *StorageRepository) PublicURL(key string) string {
	return r.publicURL + "/" + key
}

// StorageKeys provides helpers to construct R2 object key paths.
var StorageKeys = struct {
	TenantLogo   func(tenantID, ext string) string
	TenantQris   func(tenantID, ext string) string
	InvoicePDF   func(tenantID, invoiceID string) string
	QuotationPDF func(tenantID, quotationID string) string
	PaymentProof func(tenantID, paymentID, ext string) string
}{
	TenantLogo:   func(tenantID, ext string) string { return fmt.Sprintf("tenants/%s/logo.%s", tenantID, ext) },
	TenantQris:   func(tenantID, ext string) string { return fmt.Sprintf("tenants/%s/qris.%s", tenantID, ext) },
	InvoicePDF:   func(tenantID, invoiceID string) string { return fmt.Sprintf("invoices/%s/%s/invoice.pdf", tenantID, invoiceID) },
	QuotationPDF: func(tenantID, quotationID string) string { return fmt.Sprintf("quotations/%s/%s/quotation.pdf", tenantID, quotationID) },
	PaymentProof: func(tenantID, paymentID, ext string) string { return fmt.Sprintf("payments/%s/%s/proof.%s", tenantID, paymentID, ext) },
}

// ExtFromContentType maps MIME types to file extensions.
func ExtFromContentType(contentType string) string {
	m := map[string]string{
		"application/pdf": "pdf",
		"image/png":       "png",
		"image/jpeg":      "jpg",
		"image/webp":      "webp",
		"image/gif":       "gif",
		"image/svg+xml":   "svg",
	}
	if ext, ok := m[contentType]; ok {
		return ext
	}
	return "bin"
}

// UploadLimits defines allowed types and max sizes per upload category.
type UploadLimit struct {
	AllowedTypes []string
	MaxSizeBytes int64
}

var UploadLimits = map[string]UploadLimit{
	"logo": {
		AllowedTypes: []string{"image/png", "image/jpeg", "image/webp", "image/svg+xml"},
		MaxSizeBytes: 2 * 1024 * 1024,
	},
	"qris": {
		AllowedTypes: []string{"image/png", "image/jpeg"},
		MaxSizeBytes: 1 * 1024 * 1024,
	},
	"payment_proof": {
		AllowedTypes: []string{"image/png", "image/jpeg", "image/webp", "application/pdf"},
		MaxSizeBytes: 5 * 1024 * 1024,
	},
}

// ValidateUpload checks content type and file size against the given limit.
func ValidateUpload(contentType string, sizeBytes int64, limit UploadLimit) error {
	allowed := false
	for _, t := range limit.AllowedTypes {
		if t == contentType {
			allowed = true
			break
		}
	}
	if !allowed {
		return fmt.Errorf("tipe file tidak didukung. Diizinkan: %s", strings.Join(limit.AllowedTypes, ", "))
	}
	if sizeBytes > limit.MaxSizeBytes {
		maxMB := float64(limit.MaxSizeBytes) / 1024 / 1024
		return fmt.Errorf("ukuran file terlalu besar. Maksimal %.1f MB", maxMB)
	}
	return nil
}
