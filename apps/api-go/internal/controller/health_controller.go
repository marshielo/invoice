package controller

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/pkg/response"
)

// HealthController handles health check endpoints.
type HealthController struct {
	environment string
}

// NewHealthController creates a new HealthController.
func NewHealthController(environment string) *HealthController {
	return &HealthController{environment: environment}
}

// GetHealth handles GET /health.
func (h *HealthController) GetHealth(c *gin.Context) {
	response.Success(c, model.HealthResponse{
		Status:      "ok",
		Version:     "1.0.0",
		Environment: h.environment,
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
	})
}
