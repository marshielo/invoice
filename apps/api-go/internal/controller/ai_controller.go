package controller

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// AIController handles AI-powered invoice generation endpoints.
type AIController struct {
	svc *service.AIService
}

// NewAIController creates a new AIController.
func NewAIController(svc *service.AIService) *AIController {
	return &AIController{svc: svc}
}

// GenerateInvoice handles POST /api/v1/ai/generate-invoice.
func (ac *AIController) GenerateInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.GenerateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "prompt wajib diisi dan minimal 10 karakter")
		return
	}

	result, err := ac.svc.GenerateInvoice(c.Request.Context(), tenantID, req.Prompt)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ValidationError:
			response.ValidationError(c, e.Message, nil)
		default:
			log.Printf("[GenerateInvoice] error: %v", err)
			response.InternalError(c, "Gagal memproses permintaan AI")
		}
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    result,
	})
}
