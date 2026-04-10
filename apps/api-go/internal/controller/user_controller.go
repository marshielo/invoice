package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/middleware"
	"github.com/invoicein/api-go/internal/model"
	"github.com/invoicein/api-go/internal/service"
	"github.com/invoicein/api-go/pkg/response"
)

// UserController handles user management endpoints.
type UserController struct {
	userService    *service.UserService
	settingService *service.TenantSettingsService
}

// NewUserController creates a new UserController.
func NewUserController(userService *service.UserService, settingService *service.TenantSettingsService) *UserController {
	return &UserController{
		userService:    userService,
		settingService: settingService,
	}
}

// ListUsers handles GET /api/v1/users.
func (uc *UserController) ListUsers(c *gin.Context) {
	tenantID := c.GetString(middleware.CtxTenantID)

	limit := queryInt(c, "limit", 20)
	offset := queryInt(c, "offset", 0)

	users, total, err := uc.userService.ListUsers(c.Request.Context(), tenantID, limit, offset)
	if err != nil {
		response.InternalError(c, "Gagal memuat daftar pengguna")
		return
	}

	data := make([]model.UserData, len(users))
	for i, u := range users {
		data[i] = toUserData(u)
	}

	response.Success(c, model.UsersListResponse{
		Users:  data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// GetMe handles GET /api/v1/users/me — current user's profile.
func (uc *UserController) GetMe(c *gin.Context) {
	userID := c.GetString(middleware.CtxUserID)
	tenantID := c.GetString(middleware.CtxTenantID)

	user, err := uc.userService.GetMe(c.Request.Context(), userID, tenantID)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "User")
		default:
			response.InternalError(c, "Gagal memuat profil")
		}
		return
	}

	response.Success(c, toUserData(*user))
}

// InviteUser handles POST /api/v1/users/invite.
func (uc *UserController) InviteUser(c *gin.Context) {
	role := c.GetString(middleware.CtxUserRole)
	if role != "owner" && role != "admin" {
		response.Forbidden(c, "Hanya owner atau admin yang dapat mengundang pengguna")
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)

	var req model.InviteUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	// Get subscription plan for limit check
	settings, err := uc.settingService.GetSettings(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Gagal memuat data tenant")
		return
	}

	user, err := uc.userService.InviteUser(
		c.Request.Context(),
		tenantID,
		req.Email,
		req.Role,
		settings.Tenant.SubscriptionPlan,
	)
	if err != nil {
		switch err.(type) {
		case *service.PlanLimitError:
			response.Error(c, http.StatusForbidden, err.Error(), "PLAN_LIMIT_EXCEEDED", nil)
		case *service.ConflictError:
			response.Conflict(c, err.Error())
		default:
			response.InternalError(c, "Gagal mengundang pengguna")
		}
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    toUserData(*user),
	})
}

// UpdateRole handles PATCH /api/v1/users/:id.
func (uc *UserController) UpdateRole(c *gin.Context) {
	requesterRole := c.GetString(middleware.CtxUserRole)
	if requesterRole != "owner" && requesterRole != "admin" {
		response.Forbidden(c, "Hanya owner atau admin yang dapat mengubah role pengguna")
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)
	targetID := c.Param("id")

	var req model.UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Data tidak valid", formatBindingErrors(err))
		return
	}

	user, err := uc.userService.UpdateRole(c.Request.Context(), targetID, tenantID, requesterRole, req.Role)
	if err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "User")
		case *service.ForbiddenError:
			response.Forbidden(c, err.Error())
		default:
			response.InternalError(c, "Gagal mengubah role pengguna")
		}
		return
	}

	response.Success(c, toUserData(*user))
}

// DeactivateUser handles DELETE /api/v1/users/:id.
func (uc *UserController) DeactivateUser(c *gin.Context) {
	requesterRole := c.GetString(middleware.CtxUserRole)
	if requesterRole != "owner" && requesterRole != "admin" {
		response.Forbidden(c, "Hanya owner atau admin yang dapat menonaktifkan pengguna")
		return
	}

	tenantID := c.GetString(middleware.CtxTenantID)
	requesterID := c.GetString(middleware.CtxUserID)
	targetID := c.Param("id")

	if err := uc.userService.DeactivateUser(c.Request.Context(), targetID, tenantID, requesterID); err != nil {
		switch err.(type) {
		case *service.NotFoundError:
			response.NotFound(c, "User")
		case *service.ForbiddenError:
			response.Forbidden(c, err.Error())
		default:
			response.InternalError(c, "Gagal menonaktifkan pengguna")
		}
		return
	}

	response.Success(c, gin.H{"message": "Pengguna berhasil dinonaktifkan"})
}

// toUserData converts a model.User to the API response DTO.
func toUserData(u model.User) model.UserData {
	d := model.UserData{
		ID:        u.ID,
		Email:     u.Email,
		FullName:  u.FullName,
		Phone:     u.Phone,
		AvatarURL: u.AvatarURL,
		Role:      u.Role,
		Locale:    u.Locale,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if u.LastLoginAt != nil {
		s := u.LastLoginAt.Format("2006-01-02T15:04:05Z07:00")
		d.LastLoginAt = &s
	}
	return d
}

// queryInt reads an integer query param with a fallback default.
func queryInt(c *gin.Context, key string, def int) int {
	s := c.Query(key)
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 0 {
		return def
	}
	return v
}
