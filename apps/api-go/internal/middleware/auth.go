package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/pkg/response"
	"github.com/invoicein/api-go/pkg/supabase"
)

const (
	// Context keys set by auth middleware
	CtxUserID    = "userId"
	CtxUserEmail = "userEmail"
)

// AuthMiddleware validates the Bearer JWT from the Authorization header.
// On success it sets userId and userEmail in the Gin context.
func AuthMiddleware(sb *supabase.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			response.Unauthorized(c, "Token autentikasi tidak ditemukan")
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == "" {
			response.Unauthorized(c, "Token autentikasi kosong")
			c.Abort()
			return
		}

		claims, err := sb.VerifyToken(token)
		if err != nil {
			response.Unauthorized(c, "Token tidak valid atau sudah kadaluwarsa")
			c.Abort()
			return
		}

		c.Set(CtxUserID, claims.Subject)
		c.Set(CtxUserEmail, claims.Email)
		c.Next()
	}
}
