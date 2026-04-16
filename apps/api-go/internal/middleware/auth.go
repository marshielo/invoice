package middleware

import (
	"log"
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
		log.Printf("[AuthMiddleware] %s %s | Authorization header present: %v (len=%d)",
			c.Request.Method, c.Request.URL.Path,
			strings.HasPrefix(authHeader, "Bearer "), len(authHeader))

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

		log.Printf("[AuthMiddleware] token len=%d", len(token))
		claims, err := sb.VerifyToken(token)
		if err != nil {
			log.Printf("[AuthMiddleware] VerifyToken failed: %v", err)
			response.Unauthorized(c, "Token tidak valid atau sudah kadaluwarsa")
			c.Abort()
			return
		}

		c.Set(CtxUserID, claims.Subject)
		c.Set(CtxUserEmail, claims.Email)
		c.Next()
	}
}
