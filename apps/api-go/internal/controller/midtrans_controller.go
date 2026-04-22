package controller

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/midtrans"
	"github.com/invoicein/api-go/pkg/response"
)

// MidtransController handles Midtrans payment endpoints.
type MidtransController struct {
	svc *service.MidtransService
}

// NewMidtransController creates a new MidtransController.
func NewMidtransController(svc *service.MidtransService) *MidtransController {
	return &MidtransController{svc: svc}
}

// CreatePaymentLink handles POST /api/v1/invoices/:id/payment-link.
func (mc *MidtransController) CreatePaymentLink(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	invoiceID := c.Param("id")

	tx, err := mc.svc.CreatePaymentLink(c.Request.Context(), invoiceID, tenantID)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		default:
			log.Printf("[CreatePaymentLink] error: %v", err)
			response.InternalError(c, "Gagal membuat link pembayaran")
		}
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data: gin.H{
			"snap_token":       tx.SnapToken,
			"redirect_url":     tx.SnapRedirectURL,
			"order_id":         tx.OrderID,
			"gross_amount":     tx.GrossAmount,
			"status":           tx.Status,
		},
	})
}

// WebhookHandler handles POST /api/v1/webhooks/midtrans (public, no auth).
func (mc *MidtransController) WebhookHandler(c *gin.Context) {
	var payload midtrans.NotificationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if err := mc.svc.HandleWebhook(c.Request.Context(), &payload); err != nil {
		switch e := err.(type) {
		case *service.ValidationError:
			c.JSON(http.StatusUnauthorized, gin.H{"error": e.Message})
		case *service.NotFoundError:
			// Return 200 to Midtrans even on not-found — avoid retry loops
			log.Printf("[MidtransWebhook] not found for order_id=%s: %v", payload.OrderID, err)
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		default:
			log.Printf("[MidtransWebhook] error processing order_id=%s: %v", payload.OrderID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "processing error"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
