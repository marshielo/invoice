package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// ProductController handles product management endpoints.
type ProductController struct {
	productService *service.ProductService
}

// NewProductController creates a new ProductController.
func NewProductController(productService *service.ProductService) *ProductController {
	return &ProductController{productService: productService}
}

// ListProducts handles GET /api/v1/products.
func (pc *ProductController) ListProducts(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	search := c.Query("search")
	productType := c.Query("type")
	activeOnly := c.Query("active") == "true"
	page := queryInt(c, "page", 1)
	limit := queryInt(c, "limit", 20)

	products, total, err := pc.productService.ListProducts(c.Request.Context(), tenantID, search, productType, activeOnly, page, limit)
	if err != nil {
		response.InternalError(c, "Gagal memuat daftar produk")
		return
	}

	data := make([]model.ProductData, len(products))
	for i, p := range products {
		data[i] = toProductData(p)
	}

	response.Success(c, model.ProductsListResponse{
		Data:  data,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// CreateProduct handles POST /api/v1/products.
func (pc *ProductController) CreateProduct(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	p, err := pc.productService.CreateProduct(c.Request.Context(), tenantID, &req)
	if err != nil {
		response.InternalError(c, "Gagal membuat produk")
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    toProductData(*p),
	})
}

// GetProduct handles GET /api/v1/products/:id.
func (pc *ProductController) GetProduct(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	p, err := pc.productService.GetProduct(c.Request.Context(), id, tenantID)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Product")
		default:
			response.InternalError(c, "Gagal memuat produk")
		}
		return
	}

	response.Success(c, toProductData(*p))
}

// UpdateProduct handles PATCH /api/v1/products/:id.
func (pc *ProductController) UpdateProduct(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	var req model.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	p, err := pc.productService.UpdateProduct(c.Request.Context(), id, tenantID, &req)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Product")
		default:
			response.InternalError(c, "Gagal memperbarui produk")
		}
		return
	}

	response.Success(c, toProductData(*p))
}

// DeleteProduct handles DELETE /api/v1/products/:id.
func (pc *ProductController) DeleteProduct(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	if err := pc.productService.DeleteProduct(c.Request.Context(), id, tenantID); err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Product")
		case *service.ConflictError:
			response.Conflict(c, err.Error())
		default:
			response.InternalError(c, "Gagal menghapus produk")
		}
		return
	}

	response.Success(c, gin.H{"message": "Produk berhasil dihapus"})
}

func toProductData(p model.Product) model.ProductData {
	return model.ProductData{
		ID:          p.ID,
		TenantID:    p.TenantID,
		Name:        p.Name,
		Description: p.Description,
		Unit:        p.Unit,
		Price:       p.Price,
		ProductType: p.ProductType,
		IsActive:    p.IsActive,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
