package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/model"
)

// Success returns a 200 JSON response with the standard envelope.
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    data,
	})
}

// Created returns a 201 JSON response.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    data,
	})
}

// Error returns an error JSON response with the given status code.
func Error(c *gin.Context, status int, message, code string, details interface{}) {
	resp := model.APIResponse{
		Success: false,
		Error:   message,
		Code:    code,
	}
	if details != nil {
		resp.Details = details
	}
	c.JSON(status, resp)
}

// BadRequest returns a 400 error.
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message, "BAD_REQUEST", nil)
}

// Unauthorized returns a 401 error.
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, message, "UNAUTHORIZED", nil)
}

// Forbidden returns a 403 error.
func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, message, "FORBIDDEN", nil)
}

// NotFound returns a 404 error.
func NotFound(c *gin.Context, resource string) {
	Error(c, http.StatusNotFound, resource+" tidak ditemukan", "NOT_FOUND", nil)
}

// Conflict returns a 409 error.
func Conflict(c *gin.Context, message string) {
	Error(c, http.StatusConflict, message, "CONFLICT", nil)
}

// ValidationError returns a 422 error with field details.
func ValidationError(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusUnprocessableEntity, message, "VALIDATION_ERROR", details)
}

// InternalError returns a 500 error.
func InternalError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, message, "INTERNAL_ERROR", nil)
}

// RateLimited returns a 429 error.
func RateLimited(c *gin.Context) {
	Error(c, http.StatusTooManyRequests, "Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMIT_EXCEEDED", nil)
}
