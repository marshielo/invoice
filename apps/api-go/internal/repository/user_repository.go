package repository

import (
	"context"
	"database/sql"

	"github.com/invoicein/api-go/internal/model"
)

// UserRepository handles database operations for the users table.
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByID returns a user by their ID (Supabase Auth uid).
func (r *UserRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
	query := `
		SELECT id, tenant_id, email, full_name, phone, avatar_url, role, locale,
		       is_active, last_login_at, created_at, updated_at
		FROM users
		WHERE id = $1`

	var u model.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.TenantID, &u.Email, &u.FullName, &u.Phone, &u.AvatarURL,
		&u.Role, &u.Locale, &u.IsActive, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// FindByIDWithTenant returns a user joined with their tenant.
func (r *UserRepository) FindByIDWithTenant(ctx context.Context, id string) (*model.UserWithTenant, error) {
	query := `
		SELECT u.id, u.tenant_id, u.email, u.full_name, u.phone, u.avatar_url,
		       u.role, u.locale, u.is_active, u.last_login_at, u.created_at, u.updated_at,
		       t.id, t.slug, t.name, t.email, t.phone, t.address, t.city, t.province,
		       t.postal_code, t.npwp, t.business_type, t.logo_url,
		       t.subscription_plan, t.subscription_expires_at,
		       t.invoice_prefix, t.invoice_format, t.invoice_sequence_counter,
		       t.quotation_prefix, t.quotation_sequence_counter,
		       t.credit_note_prefix, t.credit_note_sequence_counter,
		       t.default_currency, t.default_payment_terms_days,
		       t.default_notes, t.default_terms,
		       t.ppn_enabled, t.ppn_rate, t.branding,
		       t.created_at, t.updated_at, t.deleted_at
		FROM users u
		LEFT JOIN tenants t ON t.id = u.tenant_id
		WHERE u.id = $1`

	var uwt model.UserWithTenant
	var tenant model.Tenant
	var hasTenant bool

	// Tenant fields may be NULL if no tenant exists
	var tID, tSlug, tName, tEmail, tBusinessType, tSubscriptionPlan sql.NullString
	var tPhone, tAddress, tCity, tProvince, tPostalCode, tNPWP, tLogoURL sql.NullString
	var tSubscriptionExpiresAt sql.NullTime
	var tInvoicePrefix, tInvoiceFormat sql.NullString
	var tInvoiceSeqCounter sql.NullInt64
	var tQuotationPrefix sql.NullString
	var tQuotationSeqCounter sql.NullInt64
	var tCreditNotePrefix sql.NullString
	var tCreditNoteSeqCounter sql.NullInt64
	var tDefaultCurrency sql.NullString
	var tDefaultPaymentTermsDays sql.NullInt64
	var tDefaultNotes, tDefaultTerms sql.NullString
	var tPPNEnabled sql.NullBool
	var tPPNRate sql.NullString
	var tBranding []byte
	var tCreatedAt, tUpdatedAt sql.NullTime
	var tDeletedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&uwt.ID, &uwt.TenantID, &uwt.Email, &uwt.FullName, &uwt.Phone, &uwt.AvatarURL,
		&uwt.Role, &uwt.Locale, &uwt.IsActive, &uwt.LastLoginAt, &uwt.CreatedAt, &uwt.UpdatedAt,
		&tID, &tSlug, &tName, &tEmail, &tPhone, &tAddress, &tCity, &tProvince,
		&tPostalCode, &tNPWP, &tBusinessType, &tLogoURL,
		&tSubscriptionPlan, &tSubscriptionExpiresAt,
		&tInvoicePrefix, &tInvoiceFormat, &tInvoiceSeqCounter,
		&tQuotationPrefix, &tQuotationSeqCounter,
		&tCreditNotePrefix, &tCreditNoteSeqCounter,
		&tDefaultCurrency, &tDefaultPaymentTermsDays,
		&tDefaultNotes, &tDefaultTerms,
		&tPPNEnabled, &tPPNRate, &tBranding,
		&tCreatedAt, &tUpdatedAt, &tDeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	hasTenant = tID.Valid
	if hasTenant {
		tenant.ID = tID.String
		tenant.Slug = tSlug.String
		tenant.Name = tName.String
		tenant.Email = tEmail.String
		tenant.BusinessType = tBusinessType.String
		tenant.SubscriptionPlan = tSubscriptionPlan.String
		if tPhone.Valid {
			tenant.Phone = &tPhone.String
		}
		if tAddress.Valid {
			tenant.Address = &tAddress.String
		}
		if tCity.Valid {
			tenant.City = &tCity.String
		}
		if tProvince.Valid {
			tenant.Province = &tProvince.String
		}
		if tPostalCode.Valid {
			tenant.PostalCode = &tPostalCode.String
		}
		if tNPWP.Valid {
			tenant.NPWP = &tNPWP.String
		}
		if tLogoURL.Valid {
			tenant.LogoURL = &tLogoURL.String
		}
		if tSubscriptionExpiresAt.Valid {
			tenant.SubscriptionExpiresAt = &tSubscriptionExpiresAt.Time
		}
		tenant.InvoicePrefix = tInvoicePrefix.String
		tenant.InvoiceFormat = tInvoiceFormat.String
		tenant.InvoiceSequenceCounter = int(tInvoiceSeqCounter.Int64)
		tenant.QuotationPrefix = tQuotationPrefix.String
		tenant.QuotationSequenceCounter = int(tQuotationSeqCounter.Int64)
		tenant.CreditNotePrefix = tCreditNotePrefix.String
		tenant.CreditNoteSequenceCounter = int(tCreditNoteSeqCounter.Int64)
		tenant.DefaultCurrency = tDefaultCurrency.String
		tenant.DefaultPaymentTermsDays = int(tDefaultPaymentTermsDays.Int64)
		if tDefaultNotes.Valid {
			tenant.DefaultNotes = &tDefaultNotes.String
		}
		if tDefaultTerms.Valid {
			tenant.DefaultTerms = &tDefaultTerms.String
		}
		if tPPNEnabled.Valid {
			tenant.PPNEnabled = tPPNEnabled.Bool
		}
		tenant.PPNRate = tPPNRate.String
		tenant.Branding = tBranding
		if tCreatedAt.Valid {
			tenant.CreatedAt = tCreatedAt.Time
		}
		if tUpdatedAt.Valid {
			tenant.UpdatedAt = tUpdatedAt.Time
		}
		if tDeletedAt.Valid {
			tenant.DeletedAt = &tDeletedAt.Time
		}
		uwt.Tenant = &tenant
	}

	return &uwt, nil
}

// Create inserts a new user record.
func (r *UserRepository) Create(ctx context.Context, u *model.User) error {
	query := `
		INSERT INTO users (id, tenant_id, email, full_name, role, locale, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		u.ID, u.TenantID, u.Email, u.FullName, u.Role, u.Locale, u.IsActive,
	).Scan(&u.CreatedAt, &u.UpdatedAt)
}

// CreateTx inserts a new user within a transaction.
func (r *UserRepository) CreateTx(ctx context.Context, tx *sql.Tx, u *model.User) error {
	query := `
		INSERT INTO users (id, tenant_id, email, full_name, role, locale, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at, updated_at`

	return tx.QueryRowContext(ctx, query,
		u.ID, u.TenantID, u.Email, u.FullName, u.Role, u.Locale, u.IsActive,
	).Scan(&u.CreatedAt, &u.UpdatedAt)
}
