package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/invoicein/api-go/internal/model"
)

// InvoiceRepository handles all invoice-related DB operations.
type InvoiceRepository struct {
	db *sql.DB
}

// NewInvoiceRepository creates a new InvoiceRepository.
func NewInvoiceRepository(db *sql.DB) *InvoiceRepository {
	return &InvoiceRepository{db: db}
}

// BeginTx starts a database transaction.
func (r *InvoiceRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}

// ─── Sequence ─────────────────────────────────────────────────────────────────

// IncrementSequence atomically increments invoice_sequence_counter and returns
// the new counter value along with the tenant's invoice_prefix and invoice_format.
func (r *InvoiceRepository) IncrementSequence(ctx context.Context, tx *sql.Tx, tenantID string) (seq int, prefix, format string, err error) {
	const q = `
		UPDATE tenants
		SET invoice_sequence_counter = invoice_sequence_counter + 1,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING invoice_sequence_counter, invoice_prefix, invoice_format`
	err = tx.QueryRowContext(ctx, q, tenantID).Scan(&seq, &prefix, &format)
	return
}

// ─── Create ───────────────────────────────────────────────────────────────────

// Create inserts a new invoice (header only) within the given transaction.
// Populates inv.ID, inv.CreatedAt, inv.UpdatedAt on success.
func (r *InvoiceRepository) Create(ctx context.Context, tx *sql.Tx, inv *model.Invoice) error {
	const q = `
		INSERT INTO invoices (
			tenant_id, client_id, invoice_number, status,
			issue_date, due_date,
			subtotal, discount_amount, tax_amount, total, amount_paid,
			notes, terms
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12)
		RETURNING id, created_at, updated_at`
	return tx.QueryRowContext(ctx, q,
		inv.TenantID, inv.ClientID, inv.InvoiceNumber, inv.Status,
		inv.IssueDate, inv.DueDate,
		inv.Subtotal, inv.DiscountAmount, inv.TaxAmount, inv.Total,
		inv.Notes, inv.Terms,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
}

// CreateItem inserts a single invoice line item within the given transaction.
// Populates item.ID on success.
func (r *InvoiceRepository) CreateItem(ctx context.Context, tx *sql.Tx, item *model.InvoiceItem) error {
	const q = `
		INSERT INTO invoice_items (
			invoice_id, product_id, description,
			quantity, unit, unit_price, subtotal,
			tax_rate, tax_amount, sort_order
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id`
	return tx.QueryRowContext(ctx, q,
		item.InvoiceID, item.ProductID, item.Description,
		item.Quantity, item.Unit, item.UnitPrice, item.Subtotal,
		item.TaxRate, item.TaxAmount, item.SortOrder,
	).Scan(&item.ID)
}

// ─── List ─────────────────────────────────────────────────────────────────────

// ListFilter holds query parameters for listing invoices.
type ListFilter struct {
	Status   string
	ClientID string
	FromDate string
	ToDate   string
	Search   string
	Page     int
	Limit    int
}

// List returns a paginated list of invoice summaries for a tenant.
func (r *InvoiceRepository) List(ctx context.Context, tenantID string, f ListFilter) ([]model.InvoiceListItem, int, error) {
	args := []interface{}{tenantID}
	conds := []string{"i.tenant_id = $1"}
	idx := 2

	if f.Status != "" {
		conds = append(conds, fmt.Sprintf("i.status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.ClientID != "" {
		conds = append(conds, fmt.Sprintf("i.client_id = $%d", idx))
		args = append(args, f.ClientID)
		idx++
	}
	if f.FromDate != "" {
		conds = append(conds, fmt.Sprintf("i.issue_date >= $%d", idx))
		args = append(args, f.FromDate)
		idx++
	}
	if f.ToDate != "" {
		conds = append(conds, fmt.Sprintf("i.issue_date <= $%d", idx))
		args = append(args, f.ToDate)
		idx++
	}
	if f.Search != "" {
		conds = append(conds, fmt.Sprintf("i.invoice_number ILIKE $%d", idx))
		args = append(args, "%"+f.Search+"%")
		idx++
	}

	where := strings.Join(conds, " AND ")

	var total int
	countQ := "SELECT COUNT(*) FROM invoices i WHERE " + where
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("invoice list count: %w", err)
	}

	offset := (f.Page - 1) * f.Limit
	dataQ := fmt.Sprintf(`
		SELECT i.id, i.client_id, c.name,
		       i.invoice_number, i.status,
		       i.issue_date, i.due_date,
		       i.total, i.amount_paid,
		       i.created_at
		FROM invoices i
		LEFT JOIN clients c ON c.id = i.client_id
		WHERE %s
		ORDER BY i.created_at DESC
		LIMIT $%d OFFSET $%d`, where, idx, idx+1)
	args = append(args, f.Limit, offset)

	rows, err := r.db.QueryContext(ctx, dataQ, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("invoice list query: %w", err)
	}
	defer rows.Close()

	items := []model.InvoiceListItem{}
	for rows.Next() {
		var it model.InvoiceListItem
		var clientID, clientName sql.NullString
		var issueDate, createdAt time.Time
		var dueDate sql.NullTime
		if err := rows.Scan(
			&it.ID, &clientID, &clientName,
			&it.InvoiceNumber, &it.Status,
			&issueDate, &dueDate,
			&it.Total, &it.AmountPaid,
			&createdAt,
		); err != nil {
			return nil, 0, fmt.Errorf("invoice list scan: %w", err)
		}
		if clientID.Valid {
			it.ClientID = &clientID.String
		}
		if clientName.Valid {
			it.ClientName = &clientName.String
		}
		it.IssueDate = issueDate.Format("2006-01-02")
		if dueDate.Valid {
			s := dueDate.Time.Format("2006-01-02")
			it.DueDate = &s
		}
		it.CreatedAt = createdAt.Format("2006-01-02T15:04:05Z07:00")
		items = append(items, it)
	}
	return items, total, rows.Err()
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

// FindByID returns a full invoice with items and payments.
// Returns (nil, nil) if not found.
func (r *InvoiceRepository) FindByID(ctx context.Context, id, tenantID string) (*model.InvoiceData, error) {
	const q = `
		SELECT i.id, i.tenant_id, i.client_id, c.name,
		       i.invoice_number, i.status,
		       i.issue_date, i.due_date,
		       i.subtotal, i.discount_amount, i.tax_amount, i.total, i.amount_paid,
		       i.notes, i.terms, i.pdf_url, i.sent_at, i.paid_at,
		       i.created_at, i.updated_at
		FROM invoices i
		LEFT JOIN clients c ON c.id = i.client_id
		WHERE i.id = $1 AND i.tenant_id = $2`

	inv, err := scanInvoiceData(r.db.QueryRowContext(ctx, q, id, tenantID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("invoice find by id: %w", err)
	}

	// Items
	const itemQ = `
		SELECT id, product_id, description, quantity, unit,
		       unit_price, subtotal, tax_rate, tax_amount, sort_order
		FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, id`
	iRows, err := r.db.QueryContext(ctx, itemQ, id)
	if err != nil {
		return nil, fmt.Errorf("invoice items: %w", err)
	}
	defer iRows.Close()
	for iRows.Next() {
		var it model.InvoiceItemData
		var unit sql.NullString
		if err := iRows.Scan(
			&it.ID, &it.ProductID, &it.Description, &it.Quantity, &unit,
			&it.UnitPrice, &it.Subtotal, &it.TaxRate, &it.TaxAmount, &it.SortOrder,
		); err != nil {
			return nil, fmt.Errorf("invoice item scan: %w", err)
		}
		if unit.Valid {
			it.Unit = &unit.String
		}
		inv.Items = append(inv.Items, it)
	}
	if inv.Items == nil {
		inv.Items = []model.InvoiceItemData{}
	}

	// Payments
	const payQ = `
		SELECT id, amount, payment_method, payment_date,
		       reference_number, proof_url, notes, created_at
		FROM invoice_payments WHERE invoice_id = $1 ORDER BY payment_date, created_at`
	pRows, err := r.db.QueryContext(ctx, payQ, id)
	if err != nil {
		return nil, fmt.Errorf("invoice payments: %w", err)
	}
	defer pRows.Close()
	for pRows.Next() {
		var p model.InvoicePaymentData
		var method, ref, proof, notes sql.NullString
		var payDate time.Time
		var createdAt time.Time
		if err := pRows.Scan(
			&p.ID, &p.Amount, &method, &payDate,
			&ref, &proof, &notes, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("invoice payment scan: %w", err)
		}
		if method.Valid {
			p.PaymentMethod = &method.String
		}
		p.PaymentDate = payDate.Format("2006-01-02")
		if ref.Valid {
			p.ReferenceNumber = &ref.String
		}
		if proof.Valid {
			p.ProofURL = &proof.String
		}
		if notes.Valid {
			p.Notes = &notes.String
		}
		p.CreatedAt = createdAt.Format("2006-01-02T15:04:05Z07:00")
		inv.Payments = append(inv.Payments, p)
	}
	if inv.Payments == nil {
		inv.Payments = []model.InvoicePaymentData{}
	}

	return inv, nil
}

// FindRawByID returns the raw Invoice entity. Returns (nil, nil) if not found.
func (r *InvoiceRepository) FindRawByID(ctx context.Context, id, tenantID string) (*model.Invoice, error) {
	const q = `
		SELECT id, tenant_id, client_id, invoice_number, status,
		       issue_date, due_date,
		       subtotal, discount_amount, tax_amount, total, amount_paid,
		       notes, terms, pdf_url, sent_at, paid_at, created_at, updated_at
		FROM invoices WHERE id = $1 AND tenant_id = $2`
	var inv model.Invoice
	var clientID sql.NullString
	var dueDate, sentAt, paidAt sql.NullTime
	var notes, terms, pdfURL sql.NullString
	err := r.db.QueryRowContext(ctx, q, id, tenantID).Scan(
		&inv.ID, &inv.TenantID, &clientID, &inv.InvoiceNumber, &inv.Status,
		&inv.IssueDate, &dueDate,
		&inv.Subtotal, &inv.DiscountAmount, &inv.TaxAmount, &inv.Total, &inv.AmountPaid,
		&notes, &terms, &pdfURL, &sentAt, &paidAt, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if clientID.Valid {
		inv.ClientID = &clientID.String
	}
	if dueDate.Valid {
		inv.DueDate = &dueDate.Time
	}
	if notes.Valid {
		inv.Notes = &notes.String
	}
	if terms.Valid {
		inv.Terms = &terms.String
	}
	if pdfURL.Valid {
		inv.PDFURL = &pdfURL.String
	}
	if sentAt.Valid {
		inv.SentAt = &sentAt.Time
	}
	if paidAt.Valid {
		inv.PaidAt = &paidAt.Time
	}
	return &inv, nil
}

// ─── Update ───────────────────────────────────────────────────────────────────

// UpdateHeader applies partial header updates to an invoice within a transaction.
func (r *InvoiceRepository) UpdateHeader(ctx context.Context, tx *sql.Tx, id, tenantID string, fields map[string]interface{}) error {
	if len(fields) == 0 {
		return nil
	}
	setClauses := make([]string, 0, len(fields)+1)
	args := make([]interface{}, 0, len(fields)+2)
	i := 1
	for col, val := range fields {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}
	setClauses = append(setClauses, "updated_at = NOW()")
	q := fmt.Sprintf(
		"UPDATE invoices SET %s WHERE id = $%d AND tenant_id = $%d",
		strings.Join(setClauses, ", "), i, i+1,
	)
	args = append(args, id, tenantID)
	res, err := tx.ExecContext(ctx, q, args...)
	if err != nil {
		return fmt.Errorf("update invoice header: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteItems removes all line items for an invoice (used before re-inserting).
func (r *InvoiceRepository) DeleteItems(ctx context.Context, tx *sql.Tx, invoiceID string) error {
	_, err := tx.ExecContext(ctx, "DELETE FROM invoice_items WHERE invoice_id = $1", invoiceID)
	return err
}

// ─── Status Transitions ───────────────────────────────────────────────────────

// UpdateStatus sets the invoice status and any additional column overrides.
func (r *InvoiceRepository) UpdateStatus(ctx context.Context, id, tenantID, status string, extra map[string]interface{}) error {
	fields := map[string]interface{}{"status": status}
	for k, v := range extra {
		fields[k] = v
	}
	setClauses := make([]string, 0, len(fields)+1)
	args := make([]interface{}, 0, len(fields)+2)
	i := 1
	for col, val := range fields {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}
	setClauses = append(setClauses, "updated_at = NOW()")
	q := fmt.Sprintf(
		"UPDATE invoices SET %s WHERE id = $%d AND tenant_id = $%d",
		strings.Join(setClauses, ", "), i, i+1,
	)
	args = append(args, id, tenantID)
	res, err := r.db.ExecContext(ctx, q, args...)
	if err != nil {
		return fmt.Errorf("update invoice status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete removes an invoice by ID scoped to the tenant. Returns false if not found.
func (r *InvoiceRepository) Delete(ctx context.Context, id, tenantID string) (bool, error) {
	res, err := r.db.ExecContext(ctx, "DELETE FROM invoices WHERE id = $1 AND tenant_id = $2", id, tenantID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// ─── Payments ─────────────────────────────────────────────────────────────────

// CreatePayment inserts a payment and recalculates amount_paid / status.
func (r *InvoiceRepository) CreatePayment(ctx context.Context, p *model.InvoicePayment) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin payment tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	const insertQ = `
		INSERT INTO invoice_payments (
			invoice_id, tenant_id, amount, payment_method, payment_date,
			reference_number, notes, recorded_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, created_at`
	err = tx.QueryRowContext(ctx, insertQ,
		p.InvoiceID, p.TenantID, p.Amount, p.PaymentMethod, p.PaymentDate,
		p.ReferenceNumber, p.Notes, p.RecordedBy,
	).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	const recalcQ = `
		WITH totals AS (
			SELECT i.total, COALESCE(SUM(ip.amount), 0) AS paid
			FROM invoices i
			LEFT JOIN invoice_payments ip ON ip.invoice_id = i.id
			WHERE i.id = $1
			GROUP BY i.total
		)
		UPDATE invoices
		SET amount_paid = totals.paid,
		    status = CASE
		        WHEN totals.paid >= totals.total THEN 'paid'
		        WHEN totals.paid > 0              THEN 'partial'
		        ELSE status
		    END,
		    paid_at = CASE WHEN totals.paid >= totals.total THEN NOW() ELSE paid_at END,
		    updated_at = NOW()
		FROM totals
		WHERE invoices.id = $1`
	_, err = tx.ExecContext(ctx, recalcQ, p.InvoiceID)
	if err != nil {
		return fmt.Errorf("recalc amount_paid: %w", err)
	}

	return tx.Commit()
}

// DeletePayment removes a payment and recalculates amount_paid / status.
// Returns sql.ErrNoRows if not found.
func (r *InvoiceRepository) DeletePayment(ctx context.Context, paymentID, invoiceID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin delete payment tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	res, err := tx.ExecContext(ctx,
		"DELETE FROM invoice_payments WHERE id = $1 AND invoice_id = $2",
		paymentID, invoiceID)
	if err != nil {
		return fmt.Errorf("delete payment: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		err = sql.ErrNoRows
		return err
	}

	const recalcQ = `
		WITH totals AS (
			SELECT i.total, COALESCE(SUM(ip.amount), 0) AS paid
			FROM invoices i
			LEFT JOIN invoice_payments ip ON ip.invoice_id = i.id
			WHERE i.id = $1
			GROUP BY i.total
		)
		UPDATE invoices
		SET amount_paid = totals.paid,
		    status = CASE
		        WHEN totals.paid >= totals.total THEN 'paid'
		        WHEN totals.paid > 0              THEN 'partial'
		        ELSE 'sent'
		    END,
		    paid_at = CASE WHEN totals.paid >= totals.total THEN paid_at ELSE NULL END,
		    updated_at = NOW()
		FROM totals
		WHERE invoices.id = $1`
	_, err = tx.ExecContext(ctx, recalcQ, invoiceID)
	if err != nil {
		return fmt.Errorf("recalc after payment delete: %w", err)
	}

	return tx.Commit()
}

// ListPayments returns all payments for an invoice ordered by date.
func (r *InvoiceRepository) ListPayments(ctx context.Context, invoiceID, tenantID string) ([]model.InvoicePaymentData, error) {
	const q = `
		SELECT id, amount, payment_method, payment_date,
		       reference_number, proof_url, notes, created_at
		FROM invoice_payments
		WHERE invoice_id = $1
		ORDER BY payment_date, created_at`
	rows, err := r.db.QueryContext(ctx, q, invoiceID)
	if err != nil {
		return nil, fmt.Errorf("list payments: %w", err)
	}
	defer rows.Close()

	items := []model.InvoicePaymentData{}
	for rows.Next() {
		var p model.InvoicePaymentData
		var method, ref, proof, notes sql.NullString
		var payDate, createdAt time.Time
		if err := rows.Scan(&p.ID, &p.Amount, &method, &payDate, &ref, &proof, &notes, &createdAt); err != nil {
			return nil, fmt.Errorf("scan payment: %w", err)
		}
		if method.Valid {
			p.PaymentMethod = &method.String
		}
		p.PaymentDate = payDate.Format("2006-01-02")
		if ref.Valid {
			p.ReferenceNumber = &ref.String
		}
		if proof.Valid {
			p.ProofURL = &proof.String
		}
		if notes.Valid {
			p.Notes = &notes.String
		}
		p.CreatedAt = createdAt.Format("2006-01-02T15:04:05Z07:00")
		items = append(items, p)
	}
	return items, rows.Err()
}

// FindPayment fetches a single payment scoped to an invoice. Returns (nil, nil) if not found.
func (r *InvoiceRepository) FindPayment(ctx context.Context, paymentID, invoiceID string) (*model.InvoicePayment, error) {
	const q = `SELECT id, invoice_id, amount, payment_date FROM invoice_payments WHERE id = $1 AND invoice_id = $2`
	var p model.InvoicePayment
	err := r.db.QueryRowContext(ctx, q, paymentID, invoiceID).Scan(&p.ID, &p.InvoiceID, &p.Amount, &p.PaymentDate)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

// WhatsAppInvoiceInfo holds the minimal data needed to send a WhatsApp message.
type WhatsAppInvoiceInfo struct {
	InvoiceNumber string
	Status        string
	Total         string
	DueDate       *string
	PDFURL        *string
	TenantName    string
	ClientPhone   *string
	ClientName    *string
}

// FindForWhatsApp returns a lightweight view of the invoice with client phone
// and tenant name for WhatsApp dispatch. Returns (nil, nil) if not found.
func (r *InvoiceRepository) FindForWhatsApp(ctx context.Context, invoiceID, tenantID string) (*WhatsAppInvoiceInfo, error) {
	const q = `
		SELECT i.invoice_number, i.status, i.total, i.due_date, i.pdf_url,
		       t.name AS tenant_name,
		       c.phone AS client_phone, c.name AS client_name
		FROM invoices i
		JOIN tenants t ON t.id = i.tenant_id
		LEFT JOIN clients c ON c.id = i.client_id
		WHERE i.id = $1 AND i.tenant_id = $2`

	var info WhatsAppInvoiceInfo
	var dueDate, pdfURL, clientPhone, clientName sql.NullString
	err := r.db.QueryRowContext(ctx, q, invoiceID, tenantID).Scan(
		&info.InvoiceNumber, &info.Status, &info.Total, &dueDate, &pdfURL,
		&info.TenantName,
		&clientPhone, &clientName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find invoice for whatsapp: %w", err)
	}
	if dueDate.Valid {
		info.DueDate = &dueDate.String
	}
	if pdfURL.Valid {
		info.PDFURL = &pdfURL.String
	}
	if clientPhone.Valid {
		info.ClientPhone = &clientPhone.String
	}
	if clientName.Valid {
		info.ClientName = &clientName.String
	}
	return &info, nil
}

// ─── scan helper ──────────────────────────────────────────────────────────────

func scanInvoiceData(row *sql.Row) (*model.InvoiceData, error) {
	var inv model.InvoiceData
	var clientID, clientName sql.NullString
	var issueDate, createdAt, updatedAt time.Time
	var dueDate, sentAt, paidAt sql.NullTime
	var notes, terms, pdfURL sql.NullString

	if err := row.Scan(
		&inv.ID, &inv.TenantID, &clientID, &clientName,
		&inv.InvoiceNumber, &inv.Status,
		&issueDate, &dueDate,
		&inv.Subtotal, &inv.DiscountAmount, &inv.TaxAmount, &inv.Total, &inv.AmountPaid,
		&notes, &terms, &pdfURL, &sentAt, &paidAt,
		&createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}

	if clientID.Valid {
		inv.ClientID = &clientID.String
	}
	if clientName.Valid {
		inv.ClientName = &clientName.String
	}
	inv.IssueDate = issueDate.Format("2006-01-02")
	if dueDate.Valid {
		s := dueDate.Time.Format("2006-01-02")
		inv.DueDate = &s
	}
	if notes.Valid {
		inv.Notes = &notes.String
	}
	if terms.Valid {
		inv.Terms = &terms.String
	}
	if pdfURL.Valid {
		inv.PDFURL = &pdfURL.String
	}
	if sentAt.Valid {
		s := sentAt.Time.Format("2006-01-02T15:04:05Z07:00")
		inv.SentAt = &s
	}
	if paidAt.Valid {
		s := paidAt.Time.Format("2006-01-02T15:04:05Z07:00")
		inv.PaidAt = &s
	}
	inv.CreatedAt = createdAt.Format("2006-01-02T15:04:05Z07:00")
	inv.UpdatedAt = updatedAt.Format("2006-01-02T15:04:05Z07:00")

	return &inv, nil
}
