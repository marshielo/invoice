package controller

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// InvoiceController handles invoice-related endpoints.
type InvoiceController struct {
	svc       *service.InvoiceService
	pdfSvc    *service.InvoicePDFService
	waSvc     *service.WhatsAppService
}

// NewInvoiceController creates a new InvoiceController.
func NewInvoiceController(svc *service.InvoiceService, pdfSvc *service.InvoicePDFService, waSvc *service.WhatsAppService) *InvoiceController {
	return &InvoiceController{svc: svc, pdfSvc: pdfSvc, waSvc: waSvc}
}

// ─── List ─────────────────────────────────────────────────────────────────────

// ListInvoices handles GET /api/v1/invoices.
func (ic *InvoiceController) ListInvoices(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	page := queryInt(c, "page", 1)
	limit := queryInt(c, "limit", 20)

	f := repository.ListFilter{
		Status:   c.Query("status"),
		ClientID: c.Query("client_id"),
		FromDate: c.Query("from_date"),
		ToDate:   c.Query("to_date"),
		Search:   c.Query("search"),
		Page:     page,
		Limit:    limit,
	}

	items, total, err := ic.svc.ListInvoices(c.Request.Context(), tenantID, f)
	if err != nil {
		response.InternalError(c, "Gagal memuat daftar invoice")
		return
	}

	response.Success(c, model.InvoicesListResponse{
		Data:  items,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// ─── Create ───────────────────────────────────────────────────────────────────

// CreateInvoice handles POST /api/v1/invoices.
func (ic *InvoiceController) CreateInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	inv, err := ic.svc.CreateInvoice(c.Request.Context(), tenantID, &req)
	if err != nil {
		switch e := err.(type) {
		case *service.ValidationError:
			response.ValidationError(c, e.Message, nil)
		default:
			log.Printf("[CreateInvoice] error: %v", err)
			response.InternalError(c, "Gagal membuat invoice")
		}
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    inv,
	})
}

// ─── Get ──────────────────────────────────────────────────────────────────────

// GetInvoice handles GET /api/v1/invoices/:id.
func (ic *InvoiceController) GetInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	inv, err := ic.svc.GetInvoice(c.Request.Context(), id, tenantID)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Invoice")
		default:
			response.InternalError(c, "Gagal memuat invoice")
		}
		return
	}

	response.Success(c, inv)
}

// ─── Update ───────────────────────────────────────────────────────────────────

// UpdateInvoice handles PATCH /api/v1/invoices/:id.
func (ic *InvoiceController) UpdateInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	var req model.UpdateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	inv, err := ic.svc.UpdateInvoice(c.Request.Context(), id, tenantID, &req)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		case *service.ValidationError:
			response.ValidationError(c, e.Message, nil)
		default:
			response.InternalError(c, "Gagal memperbarui invoice")
		}
		return
	}

	response.Success(c, inv)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

// DeleteInvoice handles DELETE /api/v1/invoices/:id.
func (ic *InvoiceController) DeleteInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	if err := ic.svc.DeleteInvoice(c.Request.Context(), id, tenantID); err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		default:
			response.InternalError(c, "Gagal menghapus invoice")
		}
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Invoice berhasil dihapus"},
	})
}

// ─── Status Transitions ───────────────────────────────────────────────────────

// SendInvoice handles POST /api/v1/invoices/:id/send.
// It transitions the invoice to "sent" and asynchronously generates a PDF.
func (ic *InvoiceController) SendInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	inv, err := ic.svc.SendInvoice(c.Request.Context(), id, tenantID)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		default:
			response.InternalError(c, "Gagal mengirim invoice")
		}
		return
	}

	// Auto-generate PDF in the background; non-fatal if it fails.
	go func() {
		if _, pdfErr := ic.pdfSvc.GenerateAndStore(c.Request.Context(), id, tenantID); pdfErr != nil {
			// Log but do not fail the request — the PDF can be regenerated manually.
			_ = pdfErr
		}
	}()

	response.Success(c, inv)
}

// GeneratePDF handles POST /api/v1/invoices/:id/pdf.
// Generates (or regenerates) the PDF for an invoice and returns the PDF URL.
func (ic *InvoiceController) GeneratePDF(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	pdfURL, err := ic.pdfSvc.GenerateAndStore(c.Request.Context(), id, tenantID)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		default:
			_ = e
			response.InternalError(c, "Gagal membuat PDF invoice")
		}
		return
	}

	response.Success(c, gin.H{"pdf_url": pdfURL})
}

// CancelInvoice handles POST /api/v1/invoices/:id/cancel.
func (ic *InvoiceController) CancelInvoice(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	inv, err := ic.svc.CancelInvoice(c.Request.Context(), id, tenantID)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		default:
			response.InternalError(c, "Gagal membatalkan invoice")
		}
		return
	}

	response.Success(c, inv)
}

// ─── Payments ─────────────────────────────────────────────────────────────────

// CreatePayment handles POST /api/v1/invoices/:id/payments.
func (ic *InvoiceController) CreatePayment(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	invoiceID := c.Param("id")

	var req model.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	inv, err := ic.svc.RecordPayment(c.Request.Context(), invoiceID, tenantID, &req)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		case *service.ValidationError:
			response.ValidationError(c, e.Message, nil)
		default:
			response.InternalError(c, "Gagal mencatat pembayaran")
		}
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    inv,
	})
}

// DeletePayment handles DELETE /api/v1/invoices/:id/payments/:payment_id.
func (ic *InvoiceController) DeletePayment(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	invoiceID := c.Param("id")
	paymentID := c.Param("payment_id")

	inv, err := ic.svc.DeletePayment(c.Request.Context(), paymentID, invoiceID, tenantID)
	if err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		default:
			response.InternalError(c, "Gagal menghapus pembayaran")
		}
		return
	}

	response.Success(c, inv)
}

// SendWhatsApp handles POST /api/v1/invoices/:id/send-whatsapp.
func (ic *InvoiceController) SendWhatsApp(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	invoiceID := c.Param("id")

	if ic.waSvc == nil {
		response.InternalError(c, "Layanan WhatsApp tidak dikonfigurasi")
		return
	}

	if err := ic.waSvc.SendInvoiceWhatsApp(c.Request.Context(), invoiceID, tenantID); err != nil {
		switch e := err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, e.Resource)
		case *service.ConflictError:
			response.Conflict(c, e.Message)
		case *service.ValidationError:
			response.BadRequest(c, e.Message)
		default:
			log.Printf("[SendWhatsApp] error for invoice %s: %v", invoiceID, err)
			response.InternalError(c, "Gagal mengirim WhatsApp")
		}
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    map[string]string{"message": "WhatsApp terkirim"},
	})
}
