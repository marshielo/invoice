package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware configures CORS for the API.
func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"https://invoicein.id",
		"https://app.invoicein.id",
		"https://invoice-web-qhy3.vercel.app",
	}

	return cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			for _, o := range allowedOrigins {
				if o == origin {
					return true
				}
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"X-RateLimit-Limit", "X-RateLimit-Remaining"},
		AllowCredentials: true,
		MaxAge:           24 * time.Hour,
	})
}
