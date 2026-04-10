package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/invoicein/api-go/pkg/response"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type rateLimiter struct {
	mu       sync.Mutex
	entries  map[string]*rateLimitEntry
	limit    int
	windowMs time.Duration
}

func newRateLimiter(limit int, windowSeconds int) *rateLimiter {
	rl := &rateLimiter{
		entries:  make(map[string]*rateLimitEntry),
		limit:    limit,
		windowMs: time.Duration(windowSeconds) * time.Second,
	}
	// Cleanup stale entries every minute
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for k, v := range rl.entries {
				if v.resetAt.Before(now) {
					delete(rl.entries, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *rateLimiter) middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := ip + ":" + c.Request.URL.Path

		rl.mu.Lock()
		now := time.Now()

		entry, exists := rl.entries[key]
		if !exists || entry.resetAt.Before(now) {
			rl.entries[key] = &rateLimitEntry{count: 1, resetAt: now.Add(rl.windowMs)}
			rl.mu.Unlock()
			c.Next()
			return
		}

		if entry.count >= rl.limit {
			retryAfter := int(time.Until(entry.resetAt).Seconds()) + 1
			rl.mu.Unlock()
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.Header("X-RateLimit-Limit", strconv.Itoa(rl.limit))
			c.Header("X-RateLimit-Remaining", "0")
			response.RateLimited(c)
			c.Abort()
			return
		}

		entry.count++
		remaining := rl.limit - entry.count
		rl.mu.Unlock()

		c.Header("X-RateLimit-Limit", strconv.Itoa(rl.limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Next()
	}
}

// APIRateLimit is the default rate limit for API routes (120 req/60s).
var APIRateLimit = newRateLimiter(120, 60).middleware()

// AuthRateLimit is a stricter limit for auth endpoints (10 req/60s).
var AuthRateLimit = newRateLimiter(10, 60).middleware()

// AIRateLimit is a stricter limit for AI endpoints (10 req/60s).
var AIRateLimit = newRateLimiter(10, 60).middleware()
