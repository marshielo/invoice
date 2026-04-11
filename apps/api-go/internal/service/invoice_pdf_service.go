package service

import (
	"context"
	"fmt"
	"time"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/pdf"
	"github.com/invoicein/api-go/internal/repository"
)

// InvoicePDFService handles PDF generation and R2 upload for invoices.
type InvoicePDFService struct {
	invoiceRepo *repository.InvoiceRepository
	tenantRepo  *repository.TenantRepository
	storageRepo *repository.StorageRepository
}

// NewInvoicePDFService creates a new InvoicePDFService.
func NewInvoicePDFService(
	invoiceRepo *repository.InvoiceRepository,
	tenantRepo *repository.TenantRepository,
	storageRepo *repository.StorageRepository,
) *InvoicePDFService {
	return &InvoicePDFService{
		invoiceRepo: invoiceRepo,
		tenantRepo:  tenantRepo,
		storageRepo: storageRepo,
	}
}

// GenerateAndStore generates a PDF for the invoice, uploads it to R2, and
// updates invoices.pdf_url. Returns the public URL.
func (s *InvoicePDFService) GenerateAndStore(ctx context.Context, invoiceID, tenantID string) (string, error) {
	inv, err := s.invoiceRepo.FindByID(ctx, invoiceID, tenantID)
	if err != nil {
		return "", fmt.Errorf("fetch invoice: %w", err)
	}
	if inv == nil {
		return "", &NotFoundError{Resource: "Invoice"}
	}

	tenant, err := s.tenantRepo.FindByID(ctx, tenantID)
	if err != nil || tenant == nil {
		return "", fmt.Errorf("fetch tenant: %w", err)
	}

	bankAccounts, _ := s.tenantRepo.FindBankAccountsByTenantID(ctx, tenantID)

	input, err := buildPDFInput(inv, tenant, bankAccounts)
	if err != nil {
		return "", fmt.Errorf("build PDF input: %w", err)
	}

	pdfBytes, err := pdf.Generate(input)
	if err != nil {
		return "", fmt.Errorf("generate PDF: %w", err)
	}

	key := repository.StorageKeys.InvoicePDF(tenantID, invoiceID)
	pdfURL, err := s.storageRepo.Upload(ctx, key, pdfBytes, "application/pdf")
	if err != nil {
		return "", fmt.Errorf("upload PDF to R2: %w", err)
	}

	// Update pdf_url on the invoice record (reuse UpdateStatus which handles arbitrary fields)
	if err = s.invoiceRepo.UpdateStatus(ctx, invoiceID, tenantID, inv.Status, map[string]interface{}{
		"pdf_url": pdfURL,
	}); err != nil {
		return "", fmt.Errorf("update pdf_url: %w", err)
	}

	return pdfURL, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func buildPDFInput(
	inv *model.InvoiceData,
	tenant *model.Tenant,
	bankAccounts []model.TenantBankAccount,
) (pdf.InvoiceInput, error) {
	input := pdf.InvoiceInput{
		Tenant: pdf.TenantInfo{
			Name:     tenant.Name,
			Email:    tenant.Email,
			Phone:    tenant.Phone,
			Address:  tenant.Address,
			City:     tenant.City,
			Province: tenant.Province,
			NPWP:     tenant.NPWP,
		},
		InvoiceNumber:  inv.InvoiceNumber,
		Status:         inv.Status,
		Subtotal:       inv.Subtotal,
		DiscountAmount: inv.DiscountAmount,
		TaxAmount:      inv.TaxAmount,
		Total:          inv.Total,
		AmountPaid:     inv.AmountPaid,
		Notes:          inv.Notes,
		Terms:          inv.Terms,
	}

	if inv.ClientName != nil {
		input.Client = pdf.ClientInfo{Name: inv.ClientName}
	}

	issueDate, err := time.Parse("2006-01-02", inv.IssueDate)
	if err != nil {
		return pdf.InvoiceInput{}, fmt.Errorf("parse issue_date: %w", err)
	}
	input.IssueDate = issueDate

	if inv.DueDate != nil {
		if dd, err := time.Parse("2006-01-02", *inv.DueDate); err == nil {
			input.DueDate = &dd
		}
	}

	for _, it := range inv.Items {
		input.Items = append(input.Items, pdf.ItemInfo{
			Description: it.Description,
			Quantity:    it.Quantity,
			Unit:        it.Unit,
			UnitPrice:   it.UnitPrice,
			Subtotal:    it.Subtotal,
			TaxRate:     it.TaxRate,
			TaxAmount:   it.TaxAmount,
		})
	}

	for _, p := range inv.Payments {
		pd, err := time.Parse("2006-01-02", p.PaymentDate)
		if err != nil {
			continue
		}
		input.Payments = append(input.Payments, pdf.PaymentInfo{
			Amount:          p.Amount,
			PaymentMethod:   p.PaymentMethod,
			PaymentDate:     pd,
			ReferenceNumber: p.ReferenceNumber,
		})
	}

	for _, ba := range bankAccounts {
		if ba.IsActive {
			input.BankAccounts = append(input.BankAccounts, pdf.BankAccountInfo{
				BankName:          ba.BankName,
				AccountNumber:     ba.AccountNumber,
				AccountHolderName: ba.AccountHolderName,
			})
		}
	}

	return input, nil
}
