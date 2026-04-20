package model

// GenerateInvoiceRequest is the body for POST /api/v1/ai/generate-invoice.
type GenerateInvoiceRequest struct {
	Prompt string `json:"prompt" binding:"required,min=10,max=2000"`
}

// GenerateInvoiceResponse is what the endpoint returns — a pre-filled
// CreateInvoiceRequest plus Claude's plain-language explanation.
type GenerateInvoiceResponse struct {
	ClientID       *string                    `json:"client_id"`
	IssueDate      string                     `json:"issue_date"`
	DueDate        *string                    `json:"due_date"`
	Notes          *string                    `json:"notes"`
	Terms          *string                    `json:"terms"`
	DiscountAmount *float64                   `json:"discount_amount"`
	Items          []CreateInvoiceItemRequest `json:"items"`
	// Explanation is Claude's Bahasa Indonesia summary of what was parsed.
	Explanation string `json:"explanation"`
}

// InvoiceContext holds data passed to the AI to improve parsing accuracy.
type InvoiceContext struct {
	Currency  string
	PPNEnabled bool
	PPNRate   string
	Clients   []ClientContext
	Products  []ProductContext
}

// ClientContext is a lightweight client entry for AI context.
type ClientContext struct {
	ID   string
	Name string
}

// ProductContext is a lightweight product entry for AI context.
type ProductContext struct {
	ID    string
	Name  string
	Price string
	Unit  string
}
