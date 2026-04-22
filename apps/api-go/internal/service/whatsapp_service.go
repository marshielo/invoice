package service

import (
	"context"
	"fmt"

	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/fonnte"
)

// WhatsAppService handles WhatsApp invoice delivery via Fonnte.
type WhatsAppService struct {
	fonnte      *fonnte.Client
	invoiceRepo *repository.InvoiceRepository
	pdfSvc      *InvoicePDFService
}

// NewWhatsAppService creates a new WhatsAppService.
func NewWhatsAppService(
	fonnteClient *fonnte.Client,
	invoiceRepo *repository.InvoiceRepository,
	pdfSvc *InvoicePDFService,
) *WhatsAppService {
	return &WhatsAppService{
		fonnte:      fonnteClient,
		invoiceRepo: invoiceRepo,
		pdfSvc:      pdfSvc,
	}
}

// SendInvoiceWhatsApp dispatches the invoice PDF + details to the client via WhatsApp.
//
// Validation:
//   - Invoice must be in status sent or partial.
//   - Client must have a phone number.
//   - Invoice must have a PDF URL (auto-generates one if missing).
func (s *WhatsAppService) SendInvoiceWhatsApp(ctx context.Context, invoiceID, tenantID string) error {
	// 1. Fetch invoice info with client phone.
	info, err := s.invoiceRepo.FindForWhatsApp(ctx, invoiceID, tenantID)
	if err != nil {
		return fmt.Errorf("fetch invoice: %w", err)
	}
	if info == nil {
		return &NotFoundError{Resource: "Invoice"}
	}

	// 2. Validate status.
	if info.Status != "sent" && info.Status != "partial" {
		return &ConflictError{Message: "Hanya invoice dengan status sent atau partial yang dapat dikirim via WhatsApp"}
	}

	// 3. Validate client phone.
	if info.ClientPhone == nil || *info.ClientPhone == "" {
		return &ValidationError{Message: "Pelanggan tidak memiliki nomor telepon"}
	}

	// 4. Auto-generate PDF if missing.
	pdfURL := ""
	if info.PDFURL != nil && *info.PDFURL != "" {
		pdfURL = *info.PDFURL
	} else {
		generated, err := s.pdfSvc.GenerateAndStore(ctx, invoiceID, tenantID)
		if err != nil {
			return fmt.Errorf("generate PDF: %w", err)
		}
		pdfURL = generated
	}

	// 5. Build WhatsApp message.
	msg := buildWhatsAppMessage(info)

	// 6. Send via Fonnte (file + caption).
	if err := s.fonnte.SendFile(ctx, *info.ClientPhone, pdfURL, msg); err != nil {
		return fmt.Errorf("kirim WhatsApp: %w", err)
	}

	return nil
}

func buildWhatsAppMessage(info *repository.WhatsAppInvoiceInfo) string {
	clientName := "Pelanggan"
	if info.ClientName != nil && *info.ClientName != "" {
		clientName = *info.ClientName
	}

	dueDateStr := "-"
	if info.DueDate != nil && *info.DueDate != "" {
		dueDateStr = *info.DueDate
	}

	return fmt.Sprintf(
		"Halo %s,\n\n"+
			"Berikut kami lampirkan invoice dari *%s*.\n\n"+
			"📄 *Nomor Invoice:* %s\n"+
			"💰 *Total:* Rp %s\n"+
			"📅 *Jatuh Tempo:* %s\n\n"+
			"Mohon segera lakukan pembayaran sebelum tanggal jatuh tempo.\n"+
			"Terima kasih atas kepercayaan Anda! 🙏",
		clientName,
		info.TenantName,
		info.InvoiceNumber,
		formatAmount(info.Total),
		dueDateStr,
	)
}

// formatAmount formats a decimal string to a human-readable number without decimals.
func formatAmount(s string) string {
	// Parse and format to remove trailing zeros
	var amount float64
	fmt.Sscanf(s, "%f", &amount)
	if amount == float64(int64(amount)) {
		return fmt.Sprintf("%d", int64(amount))
	}
	return fmt.Sprintf("%.2f", amount)
}
