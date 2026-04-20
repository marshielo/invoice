package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/invoicein/api-go/internal/model"
)

// MidtransRepository handles midtrans_transactions DB operations.
type MidtransRepository struct {
	db *sql.DB
}

// NewMidtransRepository creates a new MidtransRepository.
func NewMidtransRepository(db *sql.DB) *MidtransRepository {
	return &MidtransRepository{db: db}
}

// Create inserts a new midtrans transaction record and returns the ID.
func (r *MidtransRepository) Create(ctx context.Context, tx *model.MidtransTransaction) error {
	const q = `
		INSERT INTO midtrans_transactions (
			invoice_id, tenant_id, order_id,
			snap_token, snap_redirect_url, gross_amount, status
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, created_at, updated_at`
	return r.db.QueryRowContext(ctx, q,
		tx.InvoiceID, tx.TenantID, tx.OrderID,
		tx.SnapToken, tx.SnapRedirectURL, tx.GrossAmount, tx.Status,
	).Scan(&tx.ID, &tx.CreatedAt, &tx.UpdatedAt)
}

// FindByOrderID fetches a transaction by Midtrans order ID.
// Returns (nil, nil) if not found.
func (r *MidtransRepository) FindByOrderID(ctx context.Context, orderID string) (*model.MidtransTransaction, error) {
	const q = `
		SELECT id, invoice_id, tenant_id, order_id,
		       snap_token, snap_redirect_url, transaction_id, payment_type,
		       gross_amount, status, fraud_status, created_at, updated_at
		FROM midtrans_transactions
		WHERE order_id = $1`
	var tx model.MidtransTransaction
	var snapToken, snapRedirectURL, transactionID, paymentType, fraudStatus sql.NullString
	err := r.db.QueryRowContext(ctx, q, orderID).Scan(
		&tx.ID, &tx.InvoiceID, &tx.TenantID, &tx.OrderID,
		&snapToken, &snapRedirectURL, &transactionID, &paymentType,
		&tx.GrossAmount, &tx.Status, &fraudStatus,
		&tx.CreatedAt, &tx.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find midtrans tx by order_id: %w", err)
	}
	if snapToken.Valid {
		tx.SnapToken = &snapToken.String
	}
	if snapRedirectURL.Valid {
		tx.SnapRedirectURL = &snapRedirectURL.String
	}
	if transactionID.Valid {
		tx.TransactionID = &transactionID.String
	}
	if paymentType.Valid {
		tx.PaymentType = &paymentType.String
	}
	if fraudStatus.Valid {
		tx.FraudStatus = &fraudStatus.String
	}
	return &tx, nil
}

// FindByInvoiceID fetches the most recent pending/active transaction for an invoice.
// Returns (nil, nil) if not found.
func (r *MidtransRepository) FindByInvoiceID(ctx context.Context, invoiceID string) (*model.MidtransTransaction, error) {
	const q = `
		SELECT id, invoice_id, tenant_id, order_id,
		       snap_token, snap_redirect_url, transaction_id, payment_type,
		       gross_amount, status, fraud_status, created_at, updated_at
		FROM midtrans_transactions
		WHERE invoice_id = $1
		ORDER BY created_at DESC
		LIMIT 1`
	var tx model.MidtransTransaction
	var snapToken, snapRedirectURL, transactionID, paymentType, fraudStatus sql.NullString
	err := r.db.QueryRowContext(ctx, q, invoiceID).Scan(
		&tx.ID, &tx.InvoiceID, &tx.TenantID, &tx.OrderID,
		&snapToken, &snapRedirectURL, &transactionID, &paymentType,
		&tx.GrossAmount, &tx.Status, &fraudStatus,
		&tx.CreatedAt, &tx.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find midtrans tx by invoice_id: %w", err)
	}
	if snapToken.Valid {
		tx.SnapToken = &snapToken.String
	}
	if snapRedirectURL.Valid {
		tx.SnapRedirectURL = &snapRedirectURL.String
	}
	if transactionID.Valid {
		tx.TransactionID = &transactionID.String
	}
	if paymentType.Valid {
		tx.PaymentType = &paymentType.String
	}
	if fraudStatus.Valid {
		tx.FraudStatus = &fraudStatus.String
	}
	return &tx, nil
}

// UpdateStatus updates the transaction status and optionally sets transaction_id,
// payment_type, fraud_status, and the raw Midtrans notification payload.
func (r *MidtransRepository) UpdateStatus(ctx context.Context, orderID, status string, fields map[string]interface{}) error {
	fields["status"] = status
	fields["updated_at"] = "NOW()"

	sets := make([]string, 0, len(fields))
	args := make([]interface{}, 0, len(fields)+1)
	i := 1
	for col, val := range fields {
		if col == "updated_at" {
			sets = append(sets, "updated_at = NOW()")
			continue
		}
		sets = append(sets, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}
	// Ensure updated_at is always set
	hasUpdatedAt := false
	for _, s := range sets {
		if s == "updated_at = NOW()" {
			hasUpdatedAt = true
			break
		}
	}
	if !hasUpdatedAt {
		sets = append(sets, "updated_at = NOW()")
	}

	setClause := ""
	for j, s := range sets {
		if j > 0 {
			setClause += ", "
		}
		setClause += s
	}
	q := fmt.Sprintf(
		"UPDATE midtrans_transactions SET %s WHERE order_id = $%d",
		setClause, i,
	)
	args = append(args, orderID)
	_, err := r.db.ExecContext(ctx, q, args...)
	return err
}

// RawPayload marshals the notification to JSON for storage.
func RawPayload(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

