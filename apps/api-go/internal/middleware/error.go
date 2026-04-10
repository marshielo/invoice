package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/internal/model"
)

// ErrorHandler is a Gin middleware that recovers from panics and returns structured errors.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Panic Recovery] %v", r)
				c.JSON(http.StatusInternalServerError, model.APIResponse{
					Success: false,
					Error:   "Terjadi kesalahan internal",
					Code:    "INTERNAL_ERROR",
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}
