package supabase

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Client provides helpers for interacting with Supabase Auth Admin API.
type Client struct {
	baseURL        string
	serviceRoleKey string
	jwtSecret      []byte
	httpClient     *http.Client
}

// NewClient creates a new Supabase admin client.
// jwtSecret is the raw value from Supabase project settings.
// We auto-detect the correct format (raw vs base64-decoded) by verifying the
// serviceRoleKey JWT — a known-good token signed by GoTrue with the same secret.
func NewClient(baseURL, serviceRoleKey, jwtSecret string) *Client {
	secretBytes := detectJWTSecretFormat(jwtSecret, serviceRoleKey)
	return &Client{
		baseURL:        strings.TrimRight(baseURL, "/"),
		serviceRoleKey: serviceRoleKey,
		jwtSecret:      secretBytes,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// detectJWTSecretFormat figures out whether the Supabase JWT secret should be
// used as raw bytes or base64-decoded bytes, by trying to verify the
// serviceRoleKey (a JWT we know was signed by the same secret).
func detectJWTSecretFormat(jwtSecret, serviceRoleKey string) []byte {
	tryVerify := func(key []byte) bool {
		_, err := jwt.ParseWithClaims(serviceRoleKey, &SupabaseClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return key, nil
		})
		return err == nil
	}

	// Option 1: base64-decoded bytes
	if decoded, err := base64.StdEncoding.DecodeString(jwtSecret); err == nil {
		if tryVerify(decoded) {
			log.Printf("[Supabase] JWT secret: using base64-decoded bytes (len=%d) ✅", len(decoded))
			return decoded
		}
		log.Printf("[Supabase] JWT secret: base64-decoded bytes (len=%d) failed self-test", len(decoded))
	}

	// Option 2: raw string bytes
	raw := []byte(jwtSecret)
	if tryVerify(raw) {
		log.Printf("[Supabase] JWT secret: using raw string bytes (len=%d) ✅", len(raw))
		return raw
	}
	log.Printf("[Supabase] JWT secret: raw bytes (len=%d) also failed self-test — check SUPABASE_JWT_SECRET", len(raw))

	// Fall back to raw bytes and let VerifyToken surface the error
	return raw
}

// SupabaseClaims represents the JWT claims from a Supabase token.
type SupabaseClaims struct {
	jwt.RegisteredClaims
	Email       string                 `json:"email"`
	AppMetadata map[string]interface{} `json:"app_metadata"`
}

// VerifyToken validates a Supabase JWT and returns the claims.
func (c *Client) VerifyToken(tokenString string) (*SupabaseClaims, error) {
	// Log first 40 chars of token for debugging (safe — doesn't expose the full token)
	tokenPreview := tokenString
	if len(tokenPreview) > 40 {
		tokenPreview = tokenPreview[:40] + "..."
	}

	token, err := jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Printf("[JWT DEBUG] unexpected signing method: %v (token: %s)", t.Header["alg"], tokenPreview)
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		log.Printf("[JWT DEBUG] verifying with alg=%v secret_len=%d", t.Header["alg"], len(c.jwtSecret))
		return c.jwtSecret, nil
	})

	if err != nil {
		log.Printf("[JWT DEBUG] parse error: %v | token: %s", err, tokenPreview)
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*SupabaseClaims)
	if !ok || !token.Valid {
		log.Printf("[JWT DEBUG] claims invalid or token not valid | token: %s", tokenPreview)
		return nil, fmt.Errorf("invalid token claims")
	}

	log.Printf("[JWT DEBUG] token verified OK for sub=%s", claims.Subject)
	return claims, nil
}

// GetUserID extracts the user ID (sub) from a Supabase JWT.
func (c *Client) GetUserID(tokenString string) (string, error) {
	claims, err := c.VerifyToken(tokenString)
	if err != nil {
		return "", err
	}
	return claims.Subject, nil
}

// UpdateUserAppMetadata updates a user's app_metadata via the Supabase Admin API.
func (c *Client) UpdateUserAppMetadata(userID string, metadata map[string]interface{}) error {
	body := map[string]interface{}{
		"app_metadata": metadata,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", c.baseURL, userID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceRoleKey)
	req.Header.Set("apikey", c.serviceRoleKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("supabase request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase admin API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// InviteUserByEmail sends a Supabase Auth invitation email.
// Returns the new Supabase user ID on success.
func (c *Client) InviteUserByEmail(email string) (string, error) {
	body := map[string]interface{}{
		"email": email,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal invite body: %w", err)
	}

	url := fmt.Sprintf("%s/auth/v1/admin/invite", c.baseURL)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceRoleKey)
	req.Header.Set("apikey", c.serviceRoleKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("supabase request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("supabase invite error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse invite response: %w", err)
	}

	return result.ID, nil
}

// BanUser disables a Supabase Auth user so they can no longer log in.
func (c *Client) BanUser(userID string) error {
	body := map[string]interface{}{
		"ban_duration": "876000h", // effectively permanent (~100 years)
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal ban body: %w", err)
	}

	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", c.baseURL, userID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceRoleKey)
	req.Header.Set("apikey", c.serviceRoleKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("supabase request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase ban error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// UnbanUser re-enables a previously banned Supabase Auth user.
func (c *Client) UnbanUser(userID string) error {
	body := map[string]interface{}{
		"ban_duration": "none",
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal unban body: %w", err)
	}

	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", c.baseURL, userID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceRoleKey)
	req.Header.Set("apikey", c.serviceRoleKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("supabase request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase unban error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
