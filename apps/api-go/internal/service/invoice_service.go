package service

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
)

// InvoiceService handles invoice business logic.
type InvoiceService struct {
	repo *repository.InvoiceRepository
}

// NewInvoiceService creates a new InvoiceService.
func NewInvoiceService(repo *repository.InvoiceRepository) *InvoiceService {
	return &InvoiceService{repo: repo}
}

// ─── List ─────────────────────────────────────────────────────────────────────

// ListInvoices returns a paginated invoice list for a tenant.
func (s *InvoiceService) ListInvoices(
	ctx context.Context, tenantID string, f repository.ListFilter,
) ([]model.InvoiceListItem, int, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 20
	}
	items, total, err := s.repo.List(ctx, tenantID, f)
	if err != nil {
		return nil, 0, fmt.Errorf("list invoices: %w", err)
	}
	return items, total, nil
}

// ─── Create ───────────────────────────────────────────────────────────────────

// CreateInvoice creates a new draft invoice with computed totals and an
// auto-generated invoice number derived from the tenant's format/prefix.
func (s *InvoiceService) CreateInvoice(
	ctx context.Context, tenantID string, req *model.CreateInvoiceRequest,
) (*model.InvoiceData, error) {

	// Parse issue_date
	issueDate, err := time.Parse("2006-01-02", req.IssueDate)
	if err != nil {
		return nil, &ValidationError{Message: "Format issue_date tidak valid (YYYY-MM-DD)"}
	}

	// Parse due_date (optional)
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		d, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			return nil, &ValidationError{Message: "Format due_date tidak valid (YYYY-MM-DD)"}
		}
		dueDate = &d
	}

	// Compute totals
	discount := 0.0
	if req.DiscountAmount != nil {
		discount = *req.DiscountAmount
	}
	subtotal, taxTotal := computeTotals(req.Items)
	total := math.Max(0, subtotal-discount+taxTotal)

	tx, err := s.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	// Generate invoice number
	seq, prefix, format, err := s.repo.IncrementSequence(ctx, tx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("increment sequence: %w", err)
	}
	invNumber := generateInvoiceNumber(prefix, format, issueDate, seq)

	inv := &model.Invoice{
		TenantID:       tenantID,
		ClientID:       req.ClientID,
		InvoiceNumber:  invNumber,
		Status:         "draft",
		IssueDate:      issueDate,
		DueDate:        dueDate,
		Subtotal:       fmt.Sprintf("%.2f", subtotal),
		DiscountAmount: fmt.Sprintf("%.2f", discount),
		TaxAmount:      fmt.Sprintf("%.2f", taxTotal),
		Total:          fmt.Sprintf("%.2f", total),
		Notes:          req.Notes,
		Terms:          req.Terms,
	}

	if err = s.repo.Create(ctx, tx, inv); err != nil {
		return nil, fmt.Errorf("create invoice: %w", err)
	}

	// Insert items
	for i, itemReq := range req.Items {
		itemSubtotal := itemReq.Quantity * itemReq.UnitPrice
		itemTax := itemSubtotal * itemReq.TaxRate / 100
		item := &model.InvoiceItem{
			InvoiceID:   inv.ID,
			ProductID:   itemReq.ProductID,
			Description: itemReq.Description,
			Quantity:    fmt.Sprintf("%.3f", itemReq.Quantity),
			Unit:        itemReq.Unit,
			UnitPrice:   fmt.Sprintf("%.2f", itemReq.UnitPrice),
			Subtotal:    fmt.Sprintf("%.2f", itemSubtotal),
			TaxRate:     fmt.Sprintf("%.2f", itemReq.TaxRate),
			TaxAmount:   fmt.Sprintf("%.2f", itemTax),
			SortOrder:   i,
		}
		if itemReq.SortOrder > 0 {
			item.SortOrder = itemReq.SortOrder
		}
		if err = s.repo.CreateItem(ctx, tx, item); err != nil {
			return nil, fmt.Errorf("create invoice item: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return s.repo.FindByID(ctx, inv.ID, tenantID)
}

// ─── Get ──────────────────────────────────────────────────────────────────────

// GetInvoice returns a full invoice with items and payments.
func (s *InvoiceService) GetInvoice(ctx context.Context, id, tenantID string) (*model.InvoiceData, error) {
	inv, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get invoice: %w", err)
	}
	if inv == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}
	return inv, nil
}

// ─── Update ───────────────────────────────────────────────────────────────────

// UpdateInvoice replaces header fields and/or line items on a draft invoice.
func (s *InvoiceService) UpdateInvoice(
	ctx context.Context, id, tenantID string, req *model.UpdateInvoiceRequest,
) (*model.InvoiceData, error) {

	// Only draft invoices can be edited
	raw, err := s.repo.FindRawByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("find invoice: %w", err)
	}
	if raw == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}
	if raw.Status != "draft" {
		return nil, &ConflictError{Message: "Hanya invoice dengan status draft yang dapat diubah"}
	}

	tx, err := s.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	// Build header update fields
	fields := map[string]interface{}{}
	if req.ClientID != nil {
		fields["client_id"] = *req.ClientID
	}
	if req.IssueDate != nil {
		d, pErr := time.Parse("2006-01-02", *req.IssueDate)
		if pErr != nil {
			return nil, &ValidationError{Message: "Format issue_date tidak valid (YYYY-MM-DD)"}
		}
		fields["issue_date"] = d
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			fields["due_date"] = nil
		} else {
			d, pErr := time.Parse("2006-01-02", *req.DueDate)
			if pErr != nil {
				return nil, &ValidationError{Message: "Format due_date tidak valid (YYYY-MM-DD)"}
			}
			fields["due_date"] = d
		}
	}
	if req.Notes != nil {
		fields["notes"] = *req.Notes
	}
	if req.Terms != nil {
		fields["terms"] = *req.Terms
	}

	// If items provided, recalculate totals
	if len(req.Items) > 0 {
		discount := 0.0
		if req.DiscountAmount != nil {
			discount = *req.DiscountAmount
		}
		subtotal, taxTotal := computeTotals(req.Items)
		total := math.Max(0, subtotal-discount+taxTotal)
		fields["subtotal"] = fmt.Sprintf("%.2f", subtotal)
		fields["discount_amount"] = fmt.Sprintf("%.2f", discount)
		fields["tax_amount"] = fmt.Sprintf("%.2f", taxTotal)
		fields["total"] = fmt.Sprintf("%.2f", total)
	} else if req.DiscountAmount != nil {
		// Only discount changed
		subtotalF, _ := strconv.ParseFloat(raw.Subtotal, 64)
		taxF, _ := strconv.ParseFloat(raw.TaxAmount, 64)
		total := math.Max(0, subtotalF-*req.DiscountAmount+taxF)
		fields["discount_amount"] = fmt.Sprintf("%.2f", *req.DiscountAmount)
		fields["total"] = fmt.Sprintf("%.2f", total)
	}

	if err = s.repo.UpdateHeader(ctx, tx, id, tenantID, fields); err != nil {
		if err == sql.ErrNoRows {
			return nil, &NotFoundError{Resource: "Invoice"}
		}
		return nil, fmt.Errorf("update invoice header: %w", err)
	}

	// Replace items if provided
	if len(req.Items) > 0 {
		if err = s.repo.DeleteItems(ctx, tx, id); err != nil {
			return nil, fmt.Errorf("delete old items: %w", err)
		}
		for i, itemReq := range req.Items {
			itemSubtotal := itemReq.Quantity * itemReq.UnitPrice
			itemTax := itemSubtotal * itemReq.TaxRate / 100
			item := &model.InvoiceItem{
				InvoiceID:   id,
				ProductID:   itemReq.ProductID,
				Description: itemReq.Description,
				Quantity:    fmt.Sprintf("%.3f", itemReq.Quantity),
				Unit:        itemReq.Unit,
				UnitPrice:   fmt.Sprintf("%.2f", itemReq.UnitPrice),
				Subtotal:    fmt.Sprintf("%.2f", itemSubtotal),
				TaxRate:     fmt.Sprintf("%.2f", itemReq.TaxRate),
				TaxAmount:   fmt.Sprintf("%.2f", itemTax),
				SortOrder:   i,
			}
			if itemReq.SortOrder > 0 {
				item.SortOrder = itemReq.SortOrder
			}
			if err = s.repo.CreateItem(ctx, tx, item); err != nil {
				return nil, fmt.Errorf("create item: %w", err)
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return s.repo.FindByID(ctx, id, tenantID)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

// DeleteInvoice deletes an invoice. Only draft invoices can be deleted.
func (s *InvoiceService) DeleteInvoice(ctx context.Context, id, tenantID string) error {
	raw, err := s.repo.FindRawByID(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("find invoice: %w", err)
	}
	if raw == nil {
		return &NotFoundError{Resource: "Invoice"}
	}
	if raw.Status != "draft" {
		return &ConflictError{Message: "Hanya invoice dengan status draft yang dapat dihapus"}
	}
	ok, err := s.repo.Delete(ctx, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete invoice: %w", err)
	}
	if !ok {
		return &NotFoundError{Resource: "Invoice"}
	}
	return nil
}

// ─── Status Transitions ───────────────────────────────────────────────────────

// SendInvoice transitions a draft invoice to sent.
func (s *InvoiceService) SendInvoice(ctx context.Context, id, tenantID string) (*model.InvoiceData, error) {
	raw, err := s.repo.FindRawByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("find invoice: %w", err)
	}
	if raw == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}
	if raw.Status != "draft" {
		return nil, &ConflictError{Message: "Hanya invoice draft yang dapat dikirim"}
	}
	now := time.Now()
	if err = s.repo.UpdateStatus(ctx, id, tenantID, "sent", map[string]interface{}{"sent_at": now}); err != nil {
		return nil, fmt.Errorf("send invoice: %w", err)
	}
	return s.repo.FindByID(ctx, id, tenantID)
}

// CancelInvoice transitions a sent/partial invoice to cancelled.
func (s *InvoiceService) CancelInvoice(ctx context.Context, id, tenantID string) (*model.InvoiceData, error) {
	raw, err := s.repo.FindRawByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("find invoice: %w", err)
	}
	if raw == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}
	if raw.Status != "sent" && raw.Status != "partial" {
		return nil, &ConflictError{Message: "Hanya invoice dengan status sent atau partial yang dapat dibatalkan"}
	}
	if err = s.repo.UpdateStatus(ctx, id, tenantID, "cancelled", nil); err != nil {
		return nil, fmt.Errorf("cancel invoice: %w", err)
	}
	return s.repo.FindByID(ctx, id, tenantID)
}

// ─── Payments ─────────────────────────────────────────────────────────────────

// RecordPayment adds a payment to an invoice and auto-transitions status.
func (s *InvoiceService) RecordPayment(
	ctx context.Context, invoiceID, tenantID string, req *model.CreatePaymentRequest,
) (*model.InvoiceData, error) {
	raw, err := s.repo.FindRawByID(ctx, invoiceID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("find invoice: %w", err)
	}
	if raw == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}
	if raw.Status != "sent" && raw.Status != "partial" {
		return nil, &ConflictError{Message: "Hanya invoice sent atau partial yang dapat menerima pembayaran"}
	}

	payDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, &ValidationError{Message: "Format payment_date tidak valid (YYYY-MM-DD)"}
	}

	p := &model.InvoicePayment{
		InvoiceID:       invoiceID,
		Amount:          fmt.Sprintf("%.2f", req.Amount),
		PaymentMethod:   req.PaymentMethod,
		PaymentDate:     payDate,
		ReferenceNumber: req.ReferenceNumber,
		Notes:           req.Notes,
	}

	if err = s.repo.CreatePayment(ctx, p); err != nil {
		return nil, fmt.Errorf("record payment: %w", err)
	}
	return s.repo.FindByID(ctx, invoiceID, tenantID)
}

// DeletePayment removes a payment from an invoice.
func (s *InvoiceService) DeletePayment(ctx context.Context, paymentID, invoiceID, tenantID string) (*model.InvoiceData, error) {
	// Verify invoice belongs to tenant
	raw, err := s.repo.FindRawByID(ctx, invoiceID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("find invoice: %w", err)
	}
	if raw == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}

	pay, err := s.repo.FindPayment(ctx, paymentID, invoiceID)
	if err != nil {
		return nil, fmt.Errorf("find payment: %w", err)
	}
	if pay == nil {
		return nil, &NotFoundError{Resource: "Payment"}
	}

	if err = s.repo.DeletePayment(ctx, paymentID, invoiceID); err != nil {
		return nil, fmt.Errorf("delete payment: %w", err)
	}
	return s.repo.FindByID(ctx, invoiceID, tenantID)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// computeTotals sums subtotals and tax amounts across items.
func computeTotals(items []model.CreateInvoiceItemRequest) (subtotal, taxTotal float64) {
	for _, it := range items {
		s := it.Quantity * it.UnitPrice
		t := s * it.TaxRate / 100
		subtotal += s
		taxTotal += t
	}
	return
}

// rePlaceholder matches {PLACEHOLDER} tokens in the invoice format string.
var rePlaceholder = regexp.MustCompile(`\{([A-Z]+)\}`)

// generateInvoiceNumber formats an invoice number using tenant prefix/format,
// the issue date, and the sequence counter.
//
// Default format when InvoiceFormat is empty: "{PREFIX}/{YEAR}/{MONTH}/{SEQ}"
// Supported placeholders: {PREFIX}, {YEAR}, {MONTH}, {SEQ}
func generateInvoiceNumber(prefix, format string, issueDate time.Time, seq int) string {
	if format == "" {
		format = "{PREFIX}/{YEAR}/{MONTH}/{SEQ}"
	}
	if prefix == "" {
		prefix = "INV"
	}
	result := rePlaceholder.ReplaceAllStringFunc(format, func(token string) string {
		inner := strings.ToUpper(token[1 : len(token)-1])
		switch inner {
		case "PREFIX":
			return prefix
		case "YEAR":
			return issueDate.Format("2006")
		case "MONTH":
			return issueDate.Format("01")
		case "SEQ":
			return fmt.Sprintf("%04d", seq)
		default:
			return token
		}
	})
	return result
}

