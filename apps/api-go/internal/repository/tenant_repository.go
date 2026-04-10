package repository

import (
	"context"
	"database/sql"

	"github.com/invoicein/api-go/internal/model"
)

// TenantRepository handles database operations for tenants and related tables.
type TenantRepository struct {
	db *sql.DB
}

// NewTenantRepository creates a new TenantRepository.
func NewTenantRepository(db *sql.DB) *TenantRepository {
	return &TenantRepository{db: db}
}

// ExistsBySlug returns true if a tenant with the given slug already exists.
func (r *TenantRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM tenants WHERE slug = $1`, slug,
	).Scan(&count)
	return count > 0, err
}

// Create inserts a new tenant and returns the full record.
func (r *TenantRepository) Create(ctx context.Context, t *model.Tenant) error {
	query := `
		INSERT INTO tenants (
			slug, name, email, phone, address, city, province, postal_code,
			business_type, subscription_plan,
			invoice_prefix, invoice_format, invoice_sequence_counter,
			quotation_prefix, quotation_sequence_counter,
			credit_note_prefix, credit_note_sequence_counter,
			default_currency, default_payment_terms_days,
			ppn_enabled, ppn_rate,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, 'free',
			'INV', '{PREFIX}/{YYYY}/{MM}/{SEQ}', 0,
			'QUO', 0,
			'CN', 0,
			'IDR', 14,
			true, '11.00',
			NOW(), NOW()
		)
		RETURNING id, subscription_plan, invoice_prefix, invoice_format,
		          invoice_sequence_counter, quotation_prefix, quotation_sequence_counter,
		          credit_note_prefix, credit_note_sequence_counter,
		          default_currency, default_payment_terms_days,
		          ppn_enabled, ppn_rate, created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		t.Slug, t.Name, t.Email, t.Phone, t.Address, t.City, t.Province, t.PostalCode,
		t.BusinessType,
	).Scan(
		&t.ID, &t.SubscriptionPlan,
		&t.InvoicePrefix, &t.InvoiceFormat, &t.InvoiceSequenceCounter,
		&t.QuotationPrefix, &t.QuotationSequenceCounter,
		&t.CreditNotePrefix, &t.CreditNoteSequenceCounter,
		&t.DefaultCurrency, &t.DefaultPaymentTermsDays,
		&t.PPNEnabled, &t.PPNRate,
		&t.CreatedAt, &t.UpdatedAt,
	)
}

// CreateTx inserts a new tenant within a transaction.
func (r *TenantRepository) CreateTx(ctx context.Context, tx *sql.Tx, t *model.Tenant) error {
	query := `
		INSERT INTO tenants (
			slug, name, email, phone, address, city, province, postal_code,
			business_type, subscription_plan,
			invoice_prefix, invoice_format, invoice_sequence_counter,
			quotation_prefix, quotation_sequence_counter,
			credit_note_prefix, credit_note_sequence_counter,
			default_currency, default_payment_terms_days,
			ppn_enabled, ppn_rate,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, 'free',
			'INV', '{PREFIX}/{YYYY}/{MM}/{SEQ}', 0,
			'QUO', 0,
			'CN', 0,
			'IDR', 14,
			true, '11.00',
			NOW(), NOW()
		)
		RETURNING id, subscription_plan, invoice_prefix, invoice_format,
		          invoice_sequence_counter, quotation_prefix, quotation_sequence_counter,
		          credit_note_prefix, credit_note_sequence_counter,
		          default_currency, default_payment_terms_days,
		          ppn_enabled, ppn_rate, created_at, updated_at`

	return tx.QueryRowContext(ctx, query,
		t.Slug, t.Name, t.Email, t.Phone, t.Address, t.City, t.Province, t.PostalCode,
		t.BusinessType,
	).Scan(
		&t.ID, &t.SubscriptionPlan,
		&t.InvoicePrefix, &t.InvoiceFormat, &t.InvoiceSequenceCounter,
		&t.QuotationPrefix, &t.QuotationSequenceCounter,
		&t.CreditNotePrefix, &t.CreditNoteSequenceCounter,
		&t.DefaultCurrency, &t.DefaultPaymentTermsDays,
		&t.PPNEnabled, &t.PPNRate,
		&t.CreatedAt, &t.UpdatedAt,
	)
}

// FindByUserID returns a tenant (with active bank accounts) for the given user ID.
func (r *TenantRepository) FindByUserID(ctx context.Context, userID string) (*model.TenantWithBankAccounts, error) {
	// First get the tenant via user join
	query := `
		SELECT t.id, t.slug, t.name, t.email, t.phone, t.address, t.city, t.province,
		       t.postal_code, t.npwp, t.business_type, t.logo_url,
		       t.subscription_plan, t.subscription_expires_at,
		       t.invoice_prefix, t.invoice_format, t.invoice_sequence_counter,
		       t.quotation_prefix, t.quotation_sequence_counter,
		       t.credit_note_prefix, t.credit_note_sequence_counter,
		       t.default_currency, t.default_payment_terms_days,
		       t.default_notes, t.default_terms,
		       t.ppn_enabled, t.ppn_rate, t.branding,
		       t.created_at, t.updated_at, t.deleted_at
		FROM tenants t
		INNER JOIN users u ON u.tenant_id = t.id
		WHERE u.id = $1 AND t.deleted_at IS NULL`

	var t model.Tenant
	var phone, address, city, province, postalCode, npwp, logoURL sql.NullString
	var subscriptionExpiresAt sql.NullTime
	var defaultNotes, defaultTerms sql.NullString
	var branding []byte
	var deletedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&t.ID, &t.Slug, &t.Name, &t.Email, &phone, &address, &city, &province,
		&postalCode, &npwp, &t.BusinessType, &logoURL,
		&t.SubscriptionPlan, &subscriptionExpiresAt,
		&t.InvoicePrefix, &t.InvoiceFormat, &t.InvoiceSequenceCounter,
		&t.QuotationPrefix, &t.QuotationSequenceCounter,
		&t.CreditNotePrefix, &t.CreditNoteSequenceCounter,
		&t.DefaultCurrency, &t.DefaultPaymentTermsDays,
		&defaultNotes, &defaultTerms,
		&t.PPNEnabled, &t.PPNRate, &branding,
		&t.CreatedAt, &t.UpdatedAt, &deletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Map nullable fields
	if phone.Valid {
		t.Phone = &phone.String
	}
	if address.Valid {
		t.Address = &address.String
	}
	if city.Valid {
		t.City = &city.String
	}
	if province.Valid {
		t.Province = &province.String
	}
	if postalCode.Valid {
		t.PostalCode = &postalCode.String
	}
	if npwp.Valid {
		t.NPWP = &npwp.String
	}
	if logoURL.Valid {
		t.LogoURL = &logoURL.String
	}
	if subscriptionExpiresAt.Valid {
		t.SubscriptionExpiresAt = &subscriptionExpiresAt.Time
	}
	if defaultNotes.Valid {
		t.DefaultNotes = &defaultNotes.String
	}
	if defaultTerms.Valid {
		t.DefaultTerms = &defaultTerms.String
	}
	t.Branding = branding
	if deletedAt.Valid {
		t.DeletedAt = &deletedAt.Time
	}

	// Fetch active bank accounts
	bankAccounts, err := r.findActiveBankAccounts(ctx, t.ID)
	if err != nil {
		return nil, err
	}

	return &model.TenantWithBankAccounts{
		Tenant:       t,
		BankAccounts: bankAccounts,
	}, nil
}

// findActiveBankAccounts returns all active bank accounts for a tenant.
func (r *TenantRepository) findActiveBankAccounts(ctx context.Context, tenantID string) ([]model.TenantBankAccount, error) {
	query := `
		SELECT id, tenant_id, bank_name, account_number, account_holder_name,
		       bank_code, is_primary, is_active, created_at
		FROM tenant_bank_accounts
		WHERE tenant_id = $1 AND is_active = true
		ORDER BY is_primary DESC, created_at ASC`

	rows, err := r.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []model.TenantBankAccount
	for rows.Next() {
		var ba model.TenantBankAccount
		var bankCode sql.NullString
		err := rows.Scan(
			&ba.ID, &ba.TenantID, &ba.BankName, &ba.AccountNumber, &ba.AccountHolderName,
			&bankCode, &ba.IsPrimary, &ba.IsActive, &ba.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if bankCode.Valid {
			ba.BankCode = &bankCode.String
		}
		accounts = append(accounts, ba)
	}
	return accounts, rows.Err()
}

// BeginTx starts a new database transaction.
func (r *TenantRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}
