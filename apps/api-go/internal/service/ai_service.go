package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/repository"
	"github.com/invoicein/api-go/pkg/anthropic"
)

// AIService handles AI-powered invoice generation.
type AIService struct {
	anthropic   *anthropic.Client
	tenantRepo  *repository.TenantRepository
	clientRepo  *repository.ClientRepository
	productRepo *repository.ProductRepository
}

// NewAIService creates a new AIService.
func NewAIService(
	anthropicClient *anthropic.Client,
	tenantRepo *repository.TenantRepository,
	clientRepo *repository.ClientRepository,
	productRepo *repository.ProductRepository,
) *AIService {
	return &AIService{
		anthropic:   anthropicClient,
		tenantRepo:  tenantRepo,
		clientRepo:  clientRepo,
		productRepo: productRepo,
	}
}

// GenerateInvoice parses a natural language prompt and returns a pre-filled
// CreateInvoiceRequest together with Claude's explanation in Bahasa Indonesia.
func (s *AIService) GenerateInvoice(
	ctx context.Context,
	tenantID, prompt string,
) (*model.GenerateInvoiceResponse, error) {

	// 1. Fetch tenant settings for PPN defaults and currency.
	tenant, err := s.tenantRepo.FindByID(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("fetch tenant: %w", err)
	}
	if tenant == nil {
		return nil, &NotFoundError{Resource: "Tenant"}
	}

	// 2. Fetch clients (top 50, no search filter) for name→id resolution.
	clients, _, err := s.clientRepo.List(ctx, tenantID, "", 1, 50)
	if err != nil {
		return nil, fmt.Errorf("fetch clients: %w", err)
	}

	// 3. Fetch active products (top 50) for name→id and price resolution.
	products, _, err := s.productRepo.List(ctx, tenantID, "", "", true, 1, 50)
	if err != nil {
		return nil, fmt.Errorf("fetch products: %w", err)
	}

	// 4. Build InvoiceContext.
	invoiceCtx := model.InvoiceContext{
		Currency:   tenant.DefaultCurrency,
		PPNEnabled: tenant.PPNEnabled,
		PPNRate:    tenant.PPNRate,
	}
	for _, c := range clients {
		invoiceCtx.Clients = append(invoiceCtx.Clients, model.ClientContext{
			ID:   c.ID,
			Name: c.Name,
		})
	}
	for _, p := range products {
		unit := ""
		if p.Unit != nil {
			unit = *p.Unit
		}
		invoiceCtx.Products = append(invoiceCtx.Products, model.ProductContext{
			ID:    p.ID,
			Name:  p.Name,
			Price: p.Price,
			Unit:  unit,
		})
	}

	// 5. Build system prompt.
	systemPrompt := buildSystemPrompt(invoiceCtx)

	// 6. Call Claude.
	rawResponse, err := s.anthropic.Complete(ctx, systemPrompt, prompt)
	if err != nil {
		return nil, fmt.Errorf("AI generation failed: %w", err)
	}

	// 7. Parse JSON from Claude's response.
	result, err := parseAIResponse(rawResponse)
	if err != nil {
		return nil, fmt.Errorf("parse AI response: %w", err)
	}

	return result, nil
}

// ─── System Prompt ────────────────────────────────────────────────────────────

func buildSystemPrompt(ctx model.InvoiceContext) string {
	today := time.Now().Format("2006-01-02")

	// Build context sections
	var sb strings.Builder

	sb.WriteString(`You are an AI assistant that parses natural language invoice descriptions (in Indonesian or English) and returns a structured JSON object.

TODAY'S DATE: ` + today + `

TASK:
Parse the user's description and return a single JSON object that matches the CreateInvoiceRequest schema below. Also include an "explanation" field in Bahasa Indonesia summarising what you understood.

SCHEMA:
{
  "client_id": string | null,          // use ID from KNOWN CLIENTS if name matches
  "issue_date": "YYYY-MM-DD",          // today if not specified
  "due_date": "YYYY-MM-DD" | null,     // infer from "due in X days", "due 30 April", etc.
  "notes": string | null,
  "terms": string | null,
  "discount_amount": number | null,
  "items": [
    {
      "product_id": string | null,     // use ID from KNOWN PRODUCTS if name matches
      "description": "string",         // required
      "quantity": number,              // default 1
      "unit": string | null,           // e.g. "jam", "item", "unit"
      "unit_price": number,            // price per unit, e.g. 500000
      "tax_rate": number               // percentage, e.g. 11
    }
  ],
  "explanation": "string"             // Bahasa Indonesia summary, 1-2 sentences
}

RULES:
- All monetary values are in ` + ctx.Currency + ` (no currency symbols in output).
- Abbreviations: "rb" = 1000, "jt" = 1000000, "k" = 1000, "m" = 1000000.
- If tax is mentioned (PPN, pajak, %) use that percentage. Otherwise:`)

	if ctx.PPNEnabled {
		sb.WriteString(`
  - Default tax_rate = ` + ctx.PPNRate + ` (tenant has PPN enabled).`)
	} else {
		sb.WriteString(`
  - Default tax_rate = 0 (tenant has PPN disabled).`)
	}

	sb.WriteString(`
- For dates: support formats like "30 April 2026", "April 30", "next week", "14 hari", "net 30".
- If due_date is relative (e.g. "14 hari" / "net 30"), compute from issue_date.
- description must not be empty — use a sensible default from context if vague.
- Return ONLY the JSON object, no markdown, no explanation outside the JSON.`)

	// Add known clients
	if len(ctx.Clients) > 0 {
		sb.WriteString("\n\nKNOWN CLIENTS (use the exact ID if name matches):\n")
		for _, c := range ctx.Clients {
			sb.WriteString(fmt.Sprintf("- ID: %s | Name: %s\n", c.ID, c.Name))
		}
	}

	// Add known products
	if len(ctx.Products) > 0 {
		sb.WriteString("\nKNOWN PRODUCTS (use the exact ID if name matches, inherit price and unit):\n")
		for _, p := range ctx.Products {
			sb.WriteString(fmt.Sprintf("- ID: %s | Name: %s | Price: %s | Unit: %s\n", p.ID, p.Name, p.Price, p.Unit))
		}
	}

	return sb.String()
}

// ─── Response Parsing ─────────────────────────────────────────────────────────

// aiRawJSON is used to unmarshal Claude's response before converting.
type aiRawJSON struct {
	ClientID       *string        `json:"client_id"`
	IssueDate      string         `json:"issue_date"`
	DueDate        *string        `json:"due_date"`
	Notes          *string        `json:"notes"`
	Terms          *string        `json:"terms"`
	DiscountAmount *float64       `json:"discount_amount"`
	Items          []aiRawItem    `json:"items"`
	Explanation    string         `json:"explanation"`
}

type aiRawItem struct {
	ProductID   *string  `json:"product_id"`
	Description string   `json:"description"`
	Quantity    float64  `json:"quantity"`
	Unit        *string  `json:"unit"`
	UnitPrice   float64  `json:"unit_price"`
	TaxRate     float64  `json:"tax_rate"`
	SortOrder   int      `json:"sort_order"`
}

func parseAIResponse(raw string) (*model.GenerateInvoiceResponse, error) {
	// Strip markdown code fences if Claude wrapped the JSON
	clean := strings.TrimSpace(raw)
	if strings.HasPrefix(clean, "```") {
		// Remove opening fence (```json or ```)
		idx := strings.Index(clean, "\n")
		if idx != -1 {
			clean = clean[idx+1:]
		}
		// Remove closing fence
		if end := strings.LastIndex(clean, "```"); end != -1 {
			clean = clean[:end]
		}
		clean = strings.TrimSpace(clean)
	}

	var parsed aiRawJSON
	if err := json.Unmarshal([]byte(clean), &parsed); err != nil {
		return nil, fmt.Errorf("invalid JSON from AI: %w (raw: %.200s)", err, raw)
	}

	// Validate / default issue_date
	if parsed.IssueDate == "" {
		parsed.IssueDate = time.Now().Format("2006-01-02")
	}
	// Sanity-check date format
	if _, err := time.Parse("2006-01-02", parsed.IssueDate); err != nil {
		parsed.IssueDate = time.Now().Format("2006-01-02")
	}

	// Convert items
	items := make([]model.CreateInvoiceItemRequest, 0, len(parsed.Items))
	for i, it := range parsed.Items {
		if it.Description == "" {
			it.Description = "Item " + fmt.Sprintf("%d", i+1)
		}
		if it.Quantity <= 0 {
			it.Quantity = 1
		}
		items = append(items, model.CreateInvoiceItemRequest{
			ProductID:   it.ProductID,
			Description: it.Description,
			Quantity:    it.Quantity,
			Unit:        it.Unit,
			UnitPrice:   it.UnitPrice,
			TaxRate:     it.TaxRate,
			SortOrder:   i,
		})
	}

	// Ensure at least one item
	if len(items) == 0 {
		items = append(items, model.CreateInvoiceItemRequest{
			Description: "Layanan",
			Quantity:    1,
			UnitPrice:   0,
			TaxRate:     0,
		})
	}

	return &model.GenerateInvoiceResponse{
		ClientID:       parsed.ClientID,
		IssueDate:      parsed.IssueDate,
		DueDate:        parsed.DueDate,
		Notes:          parsed.Notes,
		Terms:          parsed.Terms,
		DiscountAmount: parsed.DiscountAmount,
		Items:          items,
		Explanation:    parsed.Explanation,
	}, nil
}
