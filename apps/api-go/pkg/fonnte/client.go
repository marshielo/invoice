package fonnte

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const apiURL = "https://api.fonnte.com/send"

// Client wraps the Fonnte WhatsApp messaging API.
type Client struct {
	apiKey string
	http   *http.Client
}

// NewClient creates a new Fonnte client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		http:   &http.Client{Timeout: 20 * time.Second},
	}
}

// SendMessage sends a plain text WhatsApp message to a phone number.
func (c *Client) SendMessage(ctx context.Context, phone, message string) error {
	return c.send(ctx, phone, message, "", "")
}

// SendFile sends a file (by public URL) with an optional caption to a phone number.
func (c *Client) SendFile(ctx context.Context, phone, fileURL, caption string) error {
	return c.send(ctx, phone, caption, fileURL, "invoice.pdf")
}

// send is the internal helper that POSTs to the Fonnte API.
func (c *Client) send(ctx context.Context, phone, message, fileURL, filename string) error {
	body := url.Values{}
	body.Set("target", NormalizePhone(phone))
	body.Set("message", message)
	if fileURL != "" {
		body.Set("url", fileURL)
		if filename != "" {
			body.Set("filename", filename)
		}
	}

	req, err := http.NewRequestWithContext(
		ctx, http.MethodPost, apiURL,
		strings.NewReader(body.Encode()),
	)
	if err != nil {
		return fmt.Errorf("build fonnte request: %w", err)
	}
	req.Header.Set("Authorization", c.apiKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("send fonnte request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("fonnte API returned status %d", resp.StatusCode)
	}
	return nil
}

// NormalizePhone strips leading '+' and ensures Indonesian numbers start with '62'.
// e.g. "+62812..." → "62812...", "0812..." → "62812...", "812..." → "62812..."
func NormalizePhone(phone string) string {
	p := strings.TrimSpace(phone)
	p = strings.TrimPrefix(p, "+")
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")

	if strings.HasPrefix(p, "0") {
		p = "62" + p[1:]
	} else if !strings.HasPrefix(p, "62") && len(p) >= 9 {
		// Assume Indonesian number missing country code
		p = "62" + p
	}
	return p
}
