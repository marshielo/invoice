package supabase

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Client provides helpers for interacting with Supabase Auth Admin API.
type Client struct {
	baseURL        string
	serviceRoleKey string
	jwtSecret      []byte // HS256 key (service role / legacy projects)
	jwksCache      map[string]*ecdsa.PublicKey
	jwksMu         sync.RWMutex
	httpClient     *http.Client
}

// NewClient creates a new Supabase admin client.
// jwtSecret is the raw value from Supabase project settings.
// We auto-detect the correct HMAC key format, and also pre-fetch the
// project's JWKS so ES256 user tokens can be verified immediately.
func NewClient(baseURL, serviceRoleKey, jwtSecret string) *Client {
	c := &Client{
		baseURL:        strings.TrimRight(baseURL, "/"),
		serviceRoleKey: serviceRoleKey,
		jwtSecret:      detectJWTSecretFormat(jwtSecret, serviceRoleKey),
		jwksCache:      make(map[string]*ecdsa.PublicKey),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
	// Eagerly load JWKS so the first request is not slowed down.
	if err := c.refreshJWKS(); err != nil {
		log.Printf("[Supabase] JWKS pre-fetch failed (ES256 tokens will trigger a lazy fetch): %v", err)
	}
	return c
}

// ─── JWKS / EC key handling ───────────────────────────────────────────────────

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

// refreshJWKS fetches the JWKS from Supabase and populates jwksCache.
func (c *Client) refreshJWKS() error {
	url := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", c.baseURL)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return fmt.Errorf("JWKS fetch error: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var jwks jwksResponse
	if err := json.Unmarshal(body, &jwks); err != nil {
		return fmt.Errorf("JWKS parse error: %w", err)
	}

	c.jwksMu.Lock()
	defer c.jwksMu.Unlock()
	for _, k := range jwks.Keys {
		if k.Kty != "EC" || k.Crv != "P-256" {
			continue
		}
		pub, err := jwkECToPublicKey(k.X, k.Y)
		if err != nil {
			log.Printf("[Supabase] JWKS: failed to parse key kid=%s: %v", k.Kid, err)
			continue
		}
		c.jwksCache[k.Kid] = pub
		log.Printf("[Supabase] JWKS: loaded EC key kid=%s ✅", k.Kid)
	}
	return nil
}

// getECPublicKey returns the EC public key for the given key ID,
// fetching the JWKS if the key is not cached.
func (c *Client) getECPublicKey(kid string) (*ecdsa.PublicKey, error) {
	c.jwksMu.RLock()
	key, ok := c.jwksCache[kid]
	c.jwksMu.RUnlock()
	if ok {
		return key, nil
	}

	// Key not in cache — refresh JWKS and retry once.
	if err := c.refreshJWKS(); err != nil {
		return nil, fmt.Errorf("JWKS refresh failed: %w", err)
	}

	c.jwksMu.RLock()
	key, ok = c.jwksCache[kid]
	c.jwksMu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("no JWKS key found for kid=%q", kid)
	}
	return key, nil
}

// jwkECToPublicKey converts base64url-encoded x/y coordinates to *ecdsa.PublicKey.
func jwkECToPublicKey(x, y string) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(x)
	if err != nil {
		return nil, fmt.Errorf("decode x: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(y)
	if err != nil {
		return nil, fmt.Errorf("decode y: %w", err)
	}
	return &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}, nil
}

// ─── JWT secret auto-detection (HS256 / service role key) ────────────────────

// detectJWTSecretFormat figures out whether the Supabase JWT secret should be
// used as raw bytes or base64-decoded bytes, by trying to verify the
// serviceRoleKey (a known-good HS256 JWT signed by GoTrue).
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
	return raw
}

// ─── Claims & token verification ─────────────────────────────────────────────

// SupabaseClaims represents the JWT claims from a Supabase token.
type SupabaseClaims struct {
	jwt.RegisteredClaims
	Email       string                 `json:"email"`
	AppMetadata map[string]interface{} `json:"app_metadata"`
}

// VerifyToken validates a Supabase JWT (HS256 or ES256) and returns the claims.
func (c *Client) VerifyToken(tokenString string) (*SupabaseClaims, error) {
	tokenPreview := tokenString
	if len(tokenPreview) > 40 {
		tokenPreview = tokenPreview[:40] + "..."
	}

	token, err := jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(t *jwt.Token) (interface{}, error) {
		switch t.Method.(type) {
		case *jwt.SigningMethodHMAC:
			// Legacy HS256 — use the HMAC secret (service role key / old projects)
			log.Printf("[JWT] alg=HS256 secret_len=%d", len(c.jwtSecret))
			return c.jwtSecret, nil

		case *jwt.SigningMethodECDSA:
			// Modern ES256 — look up the public key by kid from JWKS
			kid, _ := t.Header["kid"].(string)
			log.Printf("[JWT] alg=ES256 kid=%s", kid)
			return c.getECPublicKey(kid)

		default:
			log.Printf("[JWT] unexpected alg=%v token=%s", t.Header["alg"], tokenPreview)
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
	})

	if err != nil {
		log.Printf("[JWT] parse error: %v | token: %s", err, tokenPreview)
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*SupabaseClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	log.Printf("[JWT] verified OK sub=%s alg=%v", claims.Subject, token.Header["alg"])
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

// ─── Supabase Admin API helpers ───────────────────────────────────────────────

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
