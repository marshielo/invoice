package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/invoicein/api-go/internal/model"
)

// ProductRepository handles database operations for the products table.
type ProductRepository struct {
	db *sql.DB
}

// NewProductRepository creates a new ProductRepository.
func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

// List returns a paginated, optionally filtered list of products for a tenant.
func (r *ProductRepository) List(ctx context.Context, tenantID, search, productType string, activeOnly bool, page, limit int) ([]model.Product, int, error) {
	offset := (page - 1) * limit

	var whereParts []string
	var args []interface{}
	args = append(args, tenantID)
	whereParts = append(whereParts, "tenant_id = $1")

	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		whereParts = append(whereParts, fmt.Sprintf("LOWER(name) LIKE $%d", len(args)))
	}
	if productType != "" {
		args = append(args, productType)
		whereParts = append(whereParts, fmt.Sprintf("product_type = $%d", len(args)))
	}
	if activeOnly {
		whereParts = append(whereParts, "is_active = true")
	}

	where := strings.Join(whereParts, " AND ")

	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM products WHERE "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	dataQ := fmt.Sprintf(`
		SELECT id, tenant_id, name, description, unit, price, product_type, is_active, created_at, updated_at
		FROM products
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

	var products []model.Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}
	return products, total, rows.Err()
}

// Create inserts a new product and returns the full record.
func (r *ProductRepository) Create(ctx context.Context, p *model.Product) error {
	isActive := true
	if !p.IsActive {
		isActive = false
	}
	query := `
		INSERT INTO products (tenant_id, name, description, unit, price, product_type, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, price, created_at, updated_at`
	return r.db.QueryRowContext(ctx, query,
		p.TenantID, p.Name, p.Description, p.Unit, p.Price, p.ProductType, isActive,
	).Scan(&p.ID, &p.Price, &p.CreatedAt, &p.UpdatedAt)
}

// FindByID returns a single product by ID, scoped to tenantID.
func (r *ProductRepository) FindByID(ctx context.Context, id, tenantID string) (*model.Product, error) {
	query := `
		SELECT id, tenant_id, name, description, unit, price, product_type, is_active, created_at, updated_at
		FROM products
		WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRowContext(ctx, query, id, tenantID)
	p, err := scanProduct(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// Update applies a partial update to a product.
func (r *ProductRepository) Update(ctx context.Context, id, tenantID string, fields map[string]interface{}) (*model.Product, error) {
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
		UPDATE products SET %s
		WHERE id = $%d AND tenant_id = $%d
		RETURNING id, tenant_id, name, description, unit, price, product_type, is_active, created_at, updated_at`,
		strings.Join(setClauses, ", "), i, i+1,
	)

	row := r.db.QueryRowContext(ctx, query, args...)
	p, err := scanProduct(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// Delete removes a product. Returns false if not found or not owned by tenant.
func (r *ProductRepository) Delete(ctx context.Context, id, tenantID string) (bool, error) {
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM products WHERE id = $1 AND tenant_id = $2`, id, tenantID,
	)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// HasInvoiceItems returns true if the product is used in any invoice items.
func (r *ProductRepository) HasInvoiceItems(ctx context.Context, id string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM invoice_items WHERE product_id = $1 LIMIT 1`, id,
	).Scan(&count)
	return count > 0, err
}

func scanProduct(row rowScanner) (model.Product, error) {
	var p model.Product
	var description, unit sql.NullString
	err := row.Scan(
		&p.ID, &p.TenantID, &p.Name,
		&description, &unit, &p.Price, &p.ProductType, &p.IsActive,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return p, err
	}
	if description.Valid { p.Description = &description.String }
	if unit.Valid { p.Unit = &unit.String }
	return p, nil
}
