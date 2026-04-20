package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/midtrans"
)

// MidtransService handles Midtrans payment link creation and webhook processing.
type MidtransService struct {
	midtransRepo *repository.MidtransRepository
	invoiceRepo  *repository.InvoiceRepository
	client       *midtrans.Client
}

// NewMidtransService creates a new MidtransService.
func NewMidtransService(
	midtransRepo *repository.MidtransRepository,
	invoiceRepo *repository.InvoiceRepository,
	client *midtrans.Client,
) *MidtransService {
	return &MidtransService{
		midtransRepo: midtransRepo,
		invoiceRepo:  invoiceRepo,
		client:       client,
	}
}

// CreatePaymentLink generates a Midtrans Snap payment link for an invoice.
// If a pending transaction already exists it returns the existing token (idempotent).
func (s *MidtransService) CreatePaymentLink(ctx context.Context, invoiceID, tenantID string) (*model.MidtransTransaction, error) {
	// Fetch invoice
	inv, err := s.invoiceRepo.FindRawByID(ctx, invoiceID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("find invoice: %w", err)
	}
	if inv == nil {
		return nil, &NotFoundError{Resource: "Invoice"}
	}
	if inv.Status != "sent" && inv.Status != "partial" {
		return nil, &ConflictError{Message: "Hanya invoice sent atau partial yang dapat membuat link pembayaran"}
	}

	// Idempotency: return existing pending transaction if one exists
	existing, err := s.midtransRepo.FindByInvoiceID(ctx, invoiceID)
	if err != nil {
		return nil, fmt.Errorf("find existing midtrans tx: %w", err)
	}
	if existing != nil && existing.Status == "pending" && existing.SnapToken != nil {
		return existing, nil
	}

	// Calculate remaining amount
	var total, amountPaid float64
	fmt.Sscanf(inv.Total, "%f", &total)
	fmt.Sscanf(inv.AmountPaid, "%f", &amountPaid)
	remaining := total - amountPaid
	if remaining <= 0 {
		return nil, &ConflictError{Message: "Invoice sudah lunas"}
	}

	// Build Midtrans order ID: invoiceNumber-unixTimestamp
	orderID := fmt.Sprintf("%s-%d", inv.InvoiceNumber, time.Now().Unix())

	// Call Midtrans Snap API
	snapReq := midtrans.SnapRequest{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:     orderID,
			GrossAmount: remaining,
		},
	}
	snapResp, err := s.client.CreateSnapTransaction(snapReq)
	if err != nil {
		return nil, fmt.Errorf("create snap transaction: %w", err)
	}

	// Persist the transaction record
	tx := &model.MidtransTransaction{
		InvoiceID:       invoiceID,
		TenantID:        tenantID,
		OrderID:         orderID,
		SnapToken:       &snapResp.Token,
		SnapRedirectURL: &snapResp.RedirectURL,
		GrossAmount:     fmt.Sprintf("%.2f", remaining),
		Status:          "pending",
	}
	if err := s.midtransRepo.Create(ctx, tx); err != nil {
		return nil, fmt.Errorf("save midtrans tx: %w", err)
	}

	return tx, nil
}

// HandleWebhook processes a Midtrans payment notification webhook.
func (s *MidtransService) HandleWebhook(ctx context.Context, payload *midtrans.NotificationPayload) error {
	// Verify signature
	if !s.client.VerifySignature(
		payload.OrderID,
		payload.StatusCode,
		payload.GrossAmount,
		payload.SignatureKey,
	) {
		return &ValidationError{Message: "Tanda tangan Midtrans tidak valid"}
	}

	// Fetch existing transaction
	tx, err := s.midtransRepo.FindByOrderID(ctx, payload.OrderID)
	if err != nil {
		return fmt.Errorf("find midtrans tx: %w", err)
	}
	if tx == nil {
		return &NotFoundError{Resource: "MidtransTransaction"}
	}

	// Marshal raw payload for storage
	rawBytes, _ := json.Marshal(payload)

	fields := map[string]interface{}{
		"transaction_id":     payload.TransactionID,
		"payment_type":       payload.PaymentType,
		"fraud_status":       payload.FraudStatus,
		"midtrans_response":  string(rawBytes),
	}

	newStatus := normaliseMidtransStatus(payload.TransactionStatus, payload.FraudStatus)

	// Update transaction status in DB
	if err := s.midtransRepo.UpdateStatus(ctx, payload.OrderID, newStatus, fields); err != nil {
		return fmt.Errorf("update midtrans tx status: %w", err)
	}

	// On settlement/capture — record as manual payment so invoice status updates
	if newStatus == "settlement" || newStatus == "capture" {
		// Avoid double-recording: check if payment already exists
		_, _ = s.recordSettlement(ctx, tx.InvoiceID, tx.TenantID, payload)
	}

	return nil
}

// recordSettlement creates an invoice_payment record for a settled Midtrans transaction.
func (s *MidtransService) recordSettlement(
	ctx context.Context, invoiceID, tenantID string,
	payload *midtrans.NotificationPayload,
) (*model.InvoiceData, error) {
	var amount float64
	fmt.Sscanf(payload.GrossAmount, "%f", &amount)

	payDate := time.Now()
	if payload.TransactionTime != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", payload.TransactionTime); err == nil {
			payDate = t
		}
	}

	paymentMethod := "midtrans"
	p := &model.InvoicePayment{
		InvoiceID:       invoiceID,
		TenantID:        tenantID,
		Amount:          fmt.Sprintf("%.2f", amount),
		PaymentMethod:   &paymentMethod,
		PaymentDate:     payDate,
		ReferenceNumber: &payload.TransactionID,
	}

	if err := s.invoiceRepo.CreatePayment(ctx, p); err != nil {
		return nil, fmt.Errorf("record midtrans payment: %w", err)
	}
	return s.invoiceRepo.FindByID(ctx, invoiceID, tenantID)
}

// normaliseMidtransStatus maps Midtrans transaction_status + fraud_status to a stored status.
func normaliseMidtransStatus(transactionStatus, fraudStatus string) string {
	switch transactionStatus {
	case "capture":
		if fraudStatus == "challenge" {
			return "capture"
		}
		return "settlement"
	case "settlement":
		return "settlement"
	case "cancel", "deny", "expire":
		return transactionStatus
	case "refund", "partial_refund":
		return "refund"
	default:
		return "pending"
	}
}
