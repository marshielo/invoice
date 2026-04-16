package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/invoicein/api-go/internal/model"
)

// ClientRepository handles database operations for the clients table.
type ClientRepository struct {
	db *sql.DB
}

// NewClientRepository creates a new ClientRepository.
func NewClientRepository(db *sql.DB) *ClientRepository {
	return &ClientRepository{db: db}
}

// List returns a paginated, optionally filtered list of clients for a tenant.
func (r *ClientRepository) List(ctx context.Context, tenantID, search string, page, limit int) ([]model.Client, int, error) {
	offset := (page - 1) * limit

	var whereParts []string
	var args []interface{}
	args = append(args, tenantID)
	whereParts = append(whereParts, "tenant_id = $1")

	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx := len(args)
		whereParts = append(whereParts, fmt.Sprintf(
			"(LOWER(name) LIKE $%d OR LOWER(COALESCE(email,'')) LIKE $%d OR LOWER(COALESCE(phone,'')) LIKE $%d)",
			idx, idx, idx,
		))
	}

	where := strings.Join(whereParts, " AND ")

	// Count total
	var total int
	countQ := "SELECT COUNT(*) FROM clients WHERE " + where
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Fetch page
	args = append(args, limit, offset)
	dataQ := fmt.Sprintf(`
		SELECT id, tenant_id, name, email, phone, address, city, province,
		       postal_code, npwp, notes, created_at, updated_at
		FROM clients
		WHERE %s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d`,
		where, len(args)-1, len(args),
	)

	rows, err := r.db.QueryContext(ctx, dataQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var clients []model.Client
	for rows.Next() {
		c, err := scanClient(rows)
		if err != nil {
			return nil, 0, err
		}
		clients = append(clients, c)
	}
	return clients, total, rows.Err()
}

// Create inserts a new client and returns the full record.
func (r *ClientRepository) Create(ctx context.Context, c *model.Client) error {
	query := `
		INSERT INTO clients (tenant_id, name, email, phone, address, city, province, postal_code, npwp, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
		RETURNING id, created_at, updated_at`
	return r.db.QueryRowContext(ctx, query,
		c.TenantID, c.Name, c.Email, c.Phone, c.Address, c.City, c.Province, c.PostalCode, c.NPWP, c.Notes,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

// FindByID returns a single client by ID, scoped to tenantID.
func (r *ClientRepository) FindByID(ctx context.Context, id, tenantID string) (*model.Client, error) {
	query := `
		SELECT id, tenant_id, name, email, phone, address, city, province,
		       postal_code, npwp, notes, created_at, updated_at
		FROM clients
		WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRowContext(ctx, query, id, tenantID)
	c, err := scanClient(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// Update applies a partial update to a client.
func (r *ClientRepository) Update(ctx context.Context, id, tenantID string, fields map[string]interface{}) (*model.Client, error) {
	if len(fields) == 0 {
		return r.FindByID(ctx, id, tenantID)
	}

	setClauses := make([]string, 0, len(fields)+1)
	args := make([]interface{}, 0, len(fields)+3)
	i := 1
	for col, val := range fields {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}
	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id, tenantID)

	query := fmt.Sprintf(`
		UPDATE clients SET %s
		WHERE id = $%d AND tenant_id = $%d
		RETURNING id, tenant_id, name, email, phone, address, city, province,
		          postal_code, npwp, notes, created_at, updated_at`,
		strings.Join(setClauses, ", "), i, i+1,
	)

	row := r.db.QueryRowContext(ctx, query, args...)
	c, err := scanClient(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// Delete removes a client. Returns false if not found or not owned by tenant.
func (r *ClientRepository) Delete(ctx context.Context, id, tenantID string) (bool, error) {
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM clients WHERE id = $1 AND tenant_id = $2`, id, tenantID,
	)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// HasInvoices returns true if the client has any invoices (prevent delete).
func (r *ClientRepository) HasInvoices(ctx context.Context, id string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM invoices WHERE client_id = $1 LIMIT 1`, id,
	).Scan(&count)
	return count > 0, err
}

// --- scanner ---

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanClient(row rowScanner) (model.Client, error) {
	var c model.Client
	var email, phone, address, city, province, postalCode, npwp, notes sql.NullString
	err := row.Scan(
		&c.ID, &c.TenantID, &c.Name,
		&email, &phone, &address, &city, &province, &postalCode, &npwp, &notes,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return c, err
	}
	if email.Valid { c.Email = &email.String }
	if phone.Valid { c.Phone = &phone.String }
	if address.Valid { c.Address = &address.String }
	if city.Valid { c.City = &city.String }
	if province.Valid { c.Province = &province.String }
	if postalCode.Valid { c.PostalCode = &postalCode.String }
	if npwp.Valid { c.NPWP = &npwp.String }
	if notes.Valid { c.Notes = &notes.String }
	return c, nil
}
