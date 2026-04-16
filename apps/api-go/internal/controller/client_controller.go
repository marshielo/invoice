package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// ClientController handles client management endpoints.
type ClientController struct {
	clientService *service.ClientService
}

// NewClientController creates a new ClientController.
func NewClientController(clientService *service.ClientService) *ClientController {
	return &ClientController{clientService: clientService}
}

// ListClients handles GET /api/v1/clients.
func (cc *ClientController) ListClients(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	search := c.Query("search")
	page := queryInt(c, "page", 1)
	limit := queryInt(c, "limit", 20)

	clients, total, err := cc.clientService.ListClients(c.Request.Context(), tenantID, search, page, limit)
	if err != nil {
		response.InternalError(c, "Gagal memuat daftar klien")
		return
	}

	data := make([]model.ClientData, len(clients))
	for i, cl := range clients {
		data[i] = toClientData(cl)
	}

	response.Success(c, model.ClientsListResponse{
		Data:  data,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// CreateClient handles POST /api/v1/clients.
func (cc *ClientController) CreateClient(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.CreateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	cl, err := cc.clientService.CreateClient(c.Request.Context(), tenantID, &req)
	if err != nil {
		response.InternalError(c, "Gagal membuat klien")
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    toClientData(*cl),
	})
}

// GetClient handles GET /api/v1/clients/:id.
func (cc *ClientController) GetClient(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	cl, err := cc.clientService.GetClient(c.Request.Context(), id, tenantID)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Client")
		default:
			response.InternalError(c, "Gagal memuat klien")
		}
		return
	}

	response.Success(c, toClientData(*cl))
}

// UpdateClient handles PATCH /api/v1/clients/:id.
func (cc *ClientController) UpdateClient(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	var req model.UpdateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	cl, err := cc.clientService.UpdateClient(c.Request.Context(), id, tenantID, &req)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Client")
		default:
			response.InternalError(c, "Gagal memperbarui klien")
		}
		return
	}

	response.Success(c, toClientData(*cl))
}

// DeleteClient handles DELETE /api/v1/clients/:id.
func (cc *ClientController) DeleteClient(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)
	id := c.Param("id")

	if err := cc.clientService.DeleteClient(c.Request.Context(), id, tenantID); err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "Client")
		case *service.ConflictError:
			response.Conflict(c, err.Error())
		default:
			response.InternalError(c, "Gagal menghapus klien")
		}
		return
	}

	response.Success(c, gin.H{"message": "Klien berhasil dihapus"})
}

func toClientData(c model.Client) model.ClientData {
	return model.ClientData{
		ID:         c.ID,
		TenantID:   c.TenantID,
		Name:       c.Name,
		Email:      c.Email,
		Phone:      c.Phone,
		Address:    c.Address,
		City:       c.City,
		Province:   c.Province,
		PostalCode: c.PostalCode,
		NPWP:       c.NPWP,
		Notes:      c.Notes,
		CreatedAt:  c.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  c.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
