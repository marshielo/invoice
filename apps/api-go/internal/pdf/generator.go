package pdf

import (
	"fmt"
	"strconv"
	"time"

	maroto "github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/line"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

// ─── Input types ──────────────────────────────────────────────────────────────

// TenantInfo holds the sender information for the PDF header.
type TenantInfo struct {
	Name       string
	Email      string
	Phone      *string
	Address    *string
	City       *string
	Province   *string
	NPWP       *string
}

// ClientInfo holds the bill-to information.
type ClientInfo struct {
	Name    *string
	Email   *string
	Phone   *string
	Address *string
	City    *string
}

// ItemInfo is one line item in the invoice.
type ItemInfo struct {
	Description string
	Quantity    string
	Unit        *string
	UnitPrice   string
	Subtotal    string
	TaxRate     string
	TaxAmount   string
}

// PaymentInfo is a recorded payment.
type PaymentInfo struct {
	Amount          string
	PaymentMethod   *string
	PaymentDate     time.Time
	ReferenceNumber *string
}

// BankAccountInfo is a tenant bank account.
type BankAccountInfo struct {
	BankName          string
	AccountNumber     string
	AccountHolderName string
}

// InvoiceInput is the full data needed to generate an invoice PDF.
type InvoiceInput struct {
	Tenant         TenantInfo
	Client         ClientInfo
	InvoiceNumber  string
	Status         string
	IssueDate      time.Time
	DueDate        *time.Time
	Items          []ItemInfo
	Subtotal       string
	DiscountAmount string
	TaxAmount      string
	Total          string
	AmountPaid     string
	Notes          *string
	Terms          *string
	Payments       []PaymentInfo
	BankAccounts   []BankAccountInfo
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// formatIDR formats a numeric string as Indonesian Rupiah.
func formatIDR(s string) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return "Rp 0"
	}
	// Manual thousand-separator formatting for IDR
	intPart := int64(f)
	formatted := ""
	str := fmt.Sprintf("%d", intPart)
	for i, c := range str {
		if i > 0 && (len(str)-i)%3 == 0 {
			formatted += "."
		}
		formatted += string(c)
	}
	return "Rp " + formatted
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func nonEmpty(parts ...string) string {
	for _, p := range parts {
		if p != "" {
			return p
		}
	}
	return ""
}

// ─── PDF generation ───────────────────────────────────────────────────────────

// Generate creates an invoice PDF and returns its bytes.
func Generate(inv InvoiceInput) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageNumber().
		WithLeftMargin(15).
		WithRightMargin(15).
		WithTopMargin(15).
		WithBottomMargin(15).
		Build()

	m := maroto.New(cfg)

	// ── Header ───────────────────────────────────────────────────────────────
	m.AddRows(
		// Tenant name (large) + Invoice label
		row.New(12).Add(
			col.New(8).Add(
				text.New(inv.Tenant.Name, props.Text{
					Size:  16,
					Style: fontstyle.Bold,
				}),
			),
			col.New(4).Add(
				text.New("INVOICE", props.Text{
					Size:  18,
					Style: fontstyle.Bold,
					Align: align.Right,
					Color: &props.Color{Red: 14, Green: 116, Blue: 144}, // sky-700
				}),
			),
		),
		// Tenant contact info
		row.New(5).Add(
			col.New(8).Add(
				text.New(inv.Tenant.Email, props.Text{Size: 9, Color: &props.Color{Red: 75, Green: 85, Blue: 99}}),
			),
			col.New(4).Add(
				text.New("# "+inv.InvoiceNumber, props.Text{Size: 10, Align: align.Right, Style: fontstyle.Bold}),
			),
		),
	)

	if deref(inv.Tenant.Phone) != "" {
		m.AddRow(5, col.New(8).Add(
			text.New(deref(inv.Tenant.Phone), props.Text{Size: 9, Color: &props.Color{Red: 75, Green: 85, Blue: 99}}),
		))
	}

	tenantAddr := nonEmpty(deref(inv.Tenant.Address), deref(inv.Tenant.City))
	if deref(inv.Tenant.Province) != "" {
		if tenantAddr != "" {
			tenantAddr += ", "
		}
		tenantAddr += deref(inv.Tenant.Province)
	}
	if tenantAddr != "" {
		m.AddRow(5, col.New(8).Add(
			text.New(tenantAddr, props.Text{Size: 9, Color: &props.Color{Red: 75, Green: 85, Blue: 99}}),
		))
	}

	if deref(inv.Tenant.NPWP) != "" {
		m.AddRow(5, col.New(8).Add(
			text.New("NPWP: "+deref(inv.Tenant.NPWP), props.Text{Size: 9}),
		))
	}

	// Invoice date info aligned right
	m.AddRows(
		row.New(5).Add(
			col.New(8),
			col.New(2).Add(text.New("Tanggal:", props.Text{Size: 9, Align: align.Right})),
			col.New(2).Add(text.New(inv.IssueDate.Format("02 Jan 2006"), props.Text{Size: 9, Align: align.Right})),
		),
	)
	if inv.DueDate != nil {
		m.AddRow(5,
			col.New(8),
			col.New(2).Add(text.New("Jatuh Tempo:", props.Text{Size: 9, Align: align.Right})),
			col.New(2).Add(text.New(inv.DueDate.Format("02 Jan 2006"), props.Text{Size: 9, Align: align.Right, Style: fontstyle.Bold})),
		)
	}

	// Divider
	m.AddRow(5, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 226, Green: 232, Blue: 240}})))

	// ── Bill To ───────────────────────────────────────────────────────────────
	m.AddRows(
		row.New(6).Add(
			col.New(6).Add(
				text.New("TAGIHAN KEPADA", props.Text{
					Size:  8,
					Style: fontstyle.Bold,
					Color: &props.Color{Red: 107, Green: 114, Blue: 128},
				}),
			),
		),
		row.New(7).Add(
			col.New(6).Add(
				text.New(deref(inv.Client.Name), props.Text{Size: 11, Style: fontstyle.Bold}),
			),
		),
	)
	if deref(inv.Client.Email) != "" {
		m.AddRow(5, col.New(6).Add(text.New(deref(inv.Client.Email), props.Text{Size: 9})))
	}
	if deref(inv.Client.Phone) != "" {
		m.AddRow(5, col.New(6).Add(text.New(deref(inv.Client.Phone), props.Text{Size: 9})))
	}
	clientAddr := deref(inv.Client.Address)
	if deref(inv.Client.City) != "" {
		if clientAddr != "" {
			clientAddr += ", "
		}
		clientAddr += deref(inv.Client.City)
	}
	if clientAddr != "" {
		m.AddRow(5, col.New(6).Add(text.New(clientAddr, props.Text{Size: 9})))
	}

	m.AddRow(6, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 226, Green: 232, Blue: 240}})))

	// ── Line items table ──────────────────────────────────────────────────────
	// Header row
	m.AddRow(8,
		col.New(5).Add(text.New("Deskripsi", props.Text{Size: 9, Style: fontstyle.Bold})),
		col.New(1).Add(text.New("Qty", props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right})),
		col.New(1).Add(text.New("Satuan", props.Text{Size: 9, Style: fontstyle.Bold})),
		col.New(2).Add(text.New("Harga Satuan", props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right})),
		col.New(1).Add(text.New("Pajak", props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right})),
		col.New(2).Add(text.New("Subtotal", props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right})),
	)
	m.AddRow(2, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 203, Green: 213, Blue: 225}})))

	for _, item := range inv.Items {
		subF, _ := strconv.ParseFloat(item.Subtotal, 64)
		taxF, _ := strconv.ParseFloat(item.TaxAmount, 64)
		total := subF + taxF
		taxRate := deref(nil)
		if item.TaxRate != "0.00" && item.TaxRate != "0" {
			taxRate = item.TaxRate + "%"
		} else {
			taxRate = "—"
		}
		m.AddRow(7,
			col.New(5).Add(text.New(item.Description, props.Text{Size: 9})),
			col.New(1).Add(text.New(item.Quantity, props.Text{Size: 9, Align: align.Right})),
			col.New(1).Add(text.New(deref(item.Unit), props.Text{Size: 9})),
			col.New(2).Add(text.New(formatIDR(item.UnitPrice), props.Text{Size: 9, Align: align.Right})),
			col.New(1).Add(text.New(taxRate, props.Text{Size: 9, Align: align.Right})),
			col.New(2).Add(text.New(formatIDR(fmt.Sprintf("%.2f", total)), props.Text{Size: 9, Align: align.Right})),
		)
	}

	m.AddRow(2, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 203, Green: 213, Blue: 225}})))

	// ── Totals ────────────────────────────────────────────────────────────────
	m.AddRows(
		row.New(6).Add(
			col.New(8),
			col.New(2).Add(text.New("Subtotal", props.Text{Size: 9, Align: align.Right})),
			col.New(2).Add(text.New(formatIDR(inv.Subtotal), props.Text{Size: 9, Align: align.Right})),
		),
	)

	discF, _ := strconv.ParseFloat(inv.DiscountAmount, 64)
	if discF > 0 {
		m.AddRow(6,
			col.New(8),
			col.New(2).Add(text.New("Diskon", props.Text{Size: 9, Align: align.Right})),
			col.New(2).Add(text.New("-"+formatIDR(inv.DiscountAmount), props.Text{Size: 9, Align: align.Right, Color: &props.Color{Red: 220, Green: 38, Blue: 38}})),
		)
	}

	taxF2, _ := strconv.ParseFloat(inv.TaxAmount, 64)
	if taxF2 > 0 {
		m.AddRow(6,
			col.New(8),
			col.New(2).Add(text.New("Pajak", props.Text{Size: 9, Align: align.Right})),
			col.New(2).Add(text.New(formatIDR(inv.TaxAmount), props.Text{Size: 9, Align: align.Right})),
		)
	}

	m.AddRow(2, col.New(4).Add(), col.New(8).Add(line.New(props.Line{Color: &props.Color{Red: 226, Green: 232, Blue: 240}})))

	m.AddRow(8,
		col.New(8),
		col.New(2).Add(text.New("TOTAL", props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Right})),
		col.New(2).Add(text.New(formatIDR(inv.Total), props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Right})),
	)

	paidF, _ := strconv.ParseFloat(inv.AmountPaid, 64)
	if paidF > 0 {
		m.AddRow(6,
			col.New(8),
			col.New(2).Add(text.New("Terbayar", props.Text{Size: 9, Align: align.Right, Color: &props.Color{Red: 22, Green: 163, Blue: 74}})),
			col.New(2).Add(text.New(formatIDR(inv.AmountPaid), props.Text{Size: 9, Align: align.Right, Color: &props.Color{Red: 22, Green: 163, Blue: 74}})),
		)
		totalF, _ := strconv.ParseFloat(inv.Total, 64)
		remaining := totalF - paidF
		if remaining > 0 {
			m.AddRow(6,
				col.New(8),
				col.New(2).Add(text.New("Sisa Tagihan", props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right, Color: &props.Color{Red: 234, Green: 88, Blue: 12}})),
				col.New(2).Add(text.New(formatIDR(fmt.Sprintf("%.2f", remaining)), props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right, Color: &props.Color{Red: 234, Green: 88, Blue: 12}})),
			)
		}
	}

	// ── Bank accounts ─────────────────────────────────────────────────────────
	if len(inv.BankAccounts) > 0 {
		m.AddRow(8, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 226, Green: 232, Blue: 240}})))
		m.AddRow(6, col.New(12).Add(
			text.New("INFORMASI PEMBAYARAN", props.Text{Size: 9, Style: fontstyle.Bold, Color: &props.Color{Red: 107, Green: 114, Blue: 128}}),
		))
		for _, ba := range inv.BankAccounts {
			m.AddRow(5, col.New(12).Add(
				text.New(fmt.Sprintf("%s — %s a.n. %s", ba.BankName, ba.AccountNumber, ba.AccountHolderName), props.Text{Size: 9}),
			))
		}
	}

	// ── Payment history ───────────────────────────────────────────────────────
	if len(inv.Payments) > 0 {
		m.AddRow(8, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 226, Green: 232, Blue: 240}})))
		m.AddRow(6, col.New(12).Add(
			text.New("RIWAYAT PEMBAYARAN", props.Text{Size: 9, Style: fontstyle.Bold, Color: &props.Color{Red: 107, Green: 114, Blue: 128}}),
		))
		for _, p := range inv.Payments {
			method := ""
			if p.PaymentMethod != nil {
				method = " (" + *p.PaymentMethod + ")"
			}
			m.AddRow(5,
				col.New(4).Add(text.New(p.PaymentDate.Format("02 Jan 2006")+method, props.Text{Size: 9})),
				col.New(4).Add(text.New(deref(p.ReferenceNumber), props.Text{Size: 9, Color: &props.Color{Red: 107, Green: 114, Blue: 128}})),
				col.New(4).Add(text.New(formatIDR(p.Amount), props.Text{Size: 9, Align: align.Right, Color: &props.Color{Red: 22, Green: 163, Blue: 74}})),
			)
		}
	}

	// ── Notes & Terms ─────────────────────────────────────────────────────────
	if deref(inv.Notes) != "" || deref(inv.Terms) != "" {
		m.AddRow(8, col.New(12).Add(line.New(props.Line{Color: &props.Color{Red: 226, Green: 232, Blue: 240}})))
		if deref(inv.Notes) != "" {
			m.AddRow(5, col.New(12).Add(text.New("Catatan:", props.Text{Size: 9, Style: fontstyle.Bold})))
			m.AddRow(12, col.New(12).Add(text.New(deref(inv.Notes), props.Text{Size: 9, Color: &props.Color{Red: 75, Green: 85, Blue: 99}})))
		}
		if deref(inv.Terms) != "" {
			m.AddRow(5, col.New(12).Add(text.New("Syarat & Ketentuan:", props.Text{Size: 9, Style: fontstyle.Bold})))
			m.AddRow(12, col.New(12).Add(text.New(deref(inv.Terms), props.Text{Size: 9, Color: &props.Color{Red: 75, Green: 85, Blue: 99}})))
		}
	}

	// ── Generate ──────────────────────────────────────────────────────────────
	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("generate PDF: %w", err)
	}
	return doc.GetBytes(), nil
}
