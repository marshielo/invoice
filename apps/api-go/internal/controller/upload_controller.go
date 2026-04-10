package controller

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// UploadController handles file upload endpoints.
type UploadController struct {
	storageService *service.StorageService
}

// NewUploadController creates a new UploadController.
func NewUploadController(storageService *service.StorageService) *UploadController {
	return &UploadController{storageService: storageService}
}

// UploadLogo handles POST /api/v1/upload/logo.
func (u *UploadController) UploadLogo(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	data, contentType, err := extractFile(c)
	if err != nil {
		response.ValidationError(c, err.Error(), nil)
		return
	}

	result, err := u.storageService.UploadLogo(c.Request.Context(), tenantID, data, contentType)
	if err != nil {
		handleStorageError(c, err)
		return
	}

	response.Success(c, model.UploadResponse{URL: result.URL, Key: result.Key})
}

// UploadQris handles POST /api/v1/upload/qris.
func (u *UploadController) UploadQris(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	data, contentType, err := extractFile(c)
	if err != nil {
		response.ValidationError(c, err.Error(), nil)
		return
	}

	result, err := u.storageService.UploadQris(c.Request.Context(), tenantID, data, contentType)
	if err != nil {
		handleStorageError(c, err)
		return
	}

	response.Success(c, model.UploadResponse{URL: result.URL, Key: result.Key})
}

// UploadPaymentProof handles POST /api/v1/upload/payment-proof/:paymentId.
func (u *UploadController) UploadPaymentProof(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	paymentID := c.Param("paymentId")

	data, contentType, err := extractFile(c)
	if err != nil {
		response.ValidationError(c, err.Error(), nil)
		return
	}

	result, err := u.storageService.UploadPaymentProof(c.Request.Context(), tenantID, paymentID, data, contentType)
	if err != nil {
		handleStorageError(c, err)
		return
	}

	response.Success(c, model.UploadResponse{URL: result.URL, Key: result.Key})
}

// DeleteFile handles DELETE /api/v1/upload/:encodedKey.
// encodedKey is a base64url-encoded R2 object key.
func (u *UploadController) DeleteFile(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	encodedKey := c.Param("encodedKey")

	// Decode base64url → R2 key
	// base64url uses - and _ instead of + and /
	standardB64 := strings.NewReplacer("-", "+", "_", "/").Replace(encodedKey)
	keyBytes, err := base64.StdEncoding.DecodeString(padBase64(standardB64))
	if err != nil {
		response.ValidationError(c, "Key tidak valid", nil)
		return
	}
	key := string(keyBytes)

	if err := u.storageService.DeleteFile(c.Request.Context(), tenantID, key); err != nil {
		handleStorageError(c, err)
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    model.DeleteResponse{Deleted: key},
	})
}

// extractFile reads the multipart "file" field from the request.
func extractFile(c *gin.Context) ([]byte, string, error) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		return nil, "", fmt.Errorf("file tidak ditemukan dalam request")
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, "", fmt.Errorf("gagal membaca file")
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}

	return data, contentType, nil
}

// handleStorageError maps service errors to HTTP responses.
func handleStorageError(c *gin.Context, err error) {
	switch err.(type) {
	case *service.ValidationError:
		response.ValidationError(c, err.Error(), nil)
	default:
		response.InternalError(c, "Gagal memproses file")
	}
}

// padBase64 adds padding to a base64 string if needed.
func padBase64(s string) string {
	switch len(s) % 4 {
	case 2:
		return s + "=="
	case 3:
		return s + "="
	}
	return s
}
