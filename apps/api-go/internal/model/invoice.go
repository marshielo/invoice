package model

import "time"

// ─── Entities ────────────────────────────────────────────────────────────────

// Invoice represents the invoices table.
type Invoice struct {
	ID             string     `json:"id" db:"id"`
	TenantID       string     `json:"tenant_id" db:"tenant_id"`
	ClientID       *string    `json:"client_id,omitempty" db:"client_id"`
	InvoiceNumber  string     `json:"invoice_number" db:"invoice_number"`
	Status         string     `json:"status" db:"status"`
	IssueDate      time.Time  `json:"issue_date" db:"issue_date"`
	DueDate        *time.Time `json:"due_date,omitempty" db:"due_date"`
	Subtotal       string     `json:"subtotal" db:"subtotal"`
	DiscountAmount string     `json:"discount_amount" db:"discount_amount"`
	TaxAmount      string     `json:"tax_amount" db:"tax_amount"`
	Total          string     `json:"total" db:"total"`
	AmountPaid     string     `json:"amount_paid" db:"amount_paid"`
	Notes          *string    `json:"notes,omitempty" db:"notes"`
	Terms          *string    `json:"terms,omitempty" db:"terms"`
	PDFURL         *string    `json:"pdf_url,omitempty" db:"pdf_url"`
	SentAt         *time.Time `json:"sent_at,omitempty" db:"sent_at"`
	PaidAt         *time.Time `json:"paid_at,omitempty" db:"paid_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// InvoiceItem represents the invoice_items table.
type InvoiceItem struct {
	ID          string  `json:"id" db:"id"`
	InvoiceID   string  `json:"invoice_id" db:"invoice_id"`
	ProductID   *string `json:"product_id,omitempty" db:"product_id"`
	Description string  `json:"description" db:"description"`
	Quantity    string  `json:"quantity" db:"quantity"`
	Unit        *string `json:"unit,omitempty" db:"unit"`
	UnitPrice   string  `json:"unit_price" db:"unit_price"`
	Subtotal    string  `json:"subtotal" db:"subtotal"`
	TaxRate     string  `json:"tax_rate" db:"tax_rate"`
	TaxAmount   string  `json:"tax_amount" db:"tax_amount"`
	SortOrder   int     `json:"sort_order" db:"sort_order"`
}

// InvoicePayment represents the invoice_payments table.
type InvoicePayment struct {
	ID              string    `json:"id" db:"id"`
	InvoiceID       string    `json:"invoice_id" db:"invoice_id"`
	Amount          string    `json:"amount" db:"amount"`
	PaymentMethod   *string   `json:"payment_method,omitempty" db:"payment_method"`
	PaymentDate     time.Time `json:"payment_date" db:"payment_date"`
	ReferenceNumber *string   `json:"reference_number,omitempty" db:"reference_number"`
	ProofURL        *string   `json:"proof_url,omitempty" db:"proof_url"`
	Notes           *string   `json:"notes,omitempty" db:"notes"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

// CreateInvoiceItemRequest is one line item on a new or updated invoice.
type CreateInvoiceItemRequest struct {
	ProductID   *string `json:"product_id"`
	Description string  `json:"description" binding:"required,min=1,max=500"`
	Quantity    float64 `json:"quantity" binding:"required,min=0.001"`
	Unit        *string `json:"unit"`
	UnitPrice   float64 `json:"unit_price" binding:"min=0"`
	TaxRate     float64 `json:"tax_rate" binding:"min=0,max=100"`
	SortOrder   int     `json:"sort_order"`
}

// CreateInvoiceRequest is the body for POST /api/v1/invoices.
type CreateInvoiceRequest struct {
	ClientID       *string                    `json:"client_id"`
	IssueDate      string                     `json:"issue_date" binding:"required"`
	DueDate        *string                    `json:"due_date"`
	Notes          *string                    `json:"notes"`
	Terms          *string                    `json:"terms"`
	DiscountAmount *float64                   `json:"discount_amount"`
	Items          []CreateInvoiceItemRequest `json:"items" binding:"required,min=1,dive"`
}

// UpdateInvoiceRequest is the body for PATCH /api/v1/invoices/:id.
type UpdateInvoiceRequest struct {
	ClientID       *string                    `json:"client_id"`
	IssueDate      *string                    `json:"issue_date"`
	DueDate        *string                    `json:"due_date"`
	Notes          *string                    `json:"notes"`
	Terms          *string                    `json:"terms"`
	DiscountAmount *float64                   `json:"discount_amount"`
	Items          []CreateInvoiceItemRequest `json:"items"`
}

// CreatePaymentRequest is the body for POST /api/v1/invoices/:id/payments.
type CreatePaymentRequest struct {
	Amount          float64 `json:"amount" binding:"required,min=0.01"`
	PaymentMethod   *string `json:"payment_method"`
	PaymentDate     string  `json:"payment_date" binding:"required"`
	ReferenceNumber *string `json:"reference_number"`
	Notes           *string `json:"notes"`
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

// InvoiceItemData is the DTO for a line item in responses.
type InvoiceItemData struct {
	ID          string  `json:"id"`
	ProductID   *string `json:"productId"`
	Description string  `json:"description"`
	Quantity    string  `json:"quantity"`
	Unit        *string `json:"unit"`
	UnitPrice   string  `json:"unitPrice"`
	Subtotal    string  `json:"subtotal"`
	TaxRate     string  `json:"taxRate"`
	TaxAmount   string  `json:"taxAmount"`
	SortOrder   int     `json:"sortOrder"`
}

// InvoicePaymentData is the DTO for a payment record in responses.
type InvoicePaymentData struct {
	ID              string  `json:"id"`
	Amount          string  `json:"amount"`
	PaymentMethod   *string `json:"paymentMethod"`
	PaymentDate     string  `json:"paymentDate"`
	ReferenceNumber *string `json:"referenceNumber"`
	ProofURL        *string `json:"proofUrl"`
	Notes           *string `json:"notes"`
	CreatedAt       string  `json:"createdAt"`
}

// InvoiceData is the full DTO for a single invoice (GET by ID).
type InvoiceData struct {
	ID             string               `json:"id"`
	TenantID       string               `json:"tenantId"`
	ClientID       *string              `json:"clientId"`
	ClientName     *string              `json:"clientName"`
	InvoiceNumber  string               `json:"invoiceNumber"`
	Status         string               `json:"status"`
	IssueDate      string               `json:"issueDate"`
	DueDate        *string              `json:"dueDate"`
	Subtotal       string               `json:"subtotal"`
	DiscountAmount string               `json:"discountAmount"`
	TaxAmount      string               `json:"taxAmount"`
	Total          string               `json:"total"`
	AmountPaid     string               `json:"amountPaid"`
	Notes          *string              `json:"notes"`
	Terms          *string              `json:"terms"`
	PDFURL         *string              `json:"pdfUrl"`
	SentAt         *string              `json:"sentAt"`
	PaidAt         *string              `json:"paidAt"`
	Items          []InvoiceItemData    `json:"items"`
	Payments       []InvoicePaymentData `json:"payments"`
	CreatedAt      string               `json:"createdAt"`
	UpdatedAt      string               `json:"updatedAt"`
}

// InvoiceListItem is the summary DTO used in list responses.
type InvoiceListItem struct {
	ID            string  `json:"id"`
	ClientID      *string `json:"clientId"`
	ClientName    *string `json:"clientName"`
	InvoiceNumber string  `json:"invoiceNumber"`
	Status        string  `json:"status"`
	IssueDate     string  `json:"issueDate"`
	DueDate       *string `json:"dueDate"`
	Total         string  `json:"total"`
	AmountPaid    string  `json:"amountPaid"`
	CreatedAt     string  `json:"createdAt"`
}

// InvoicesListResponse is returned by GET /api/v1/invoices.
type InvoicesListResponse struct {
	Data  []InvoiceListItem `json:"data"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
}
