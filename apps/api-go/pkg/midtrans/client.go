package midtrans

import (
	"bytes"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const (
	snapBaseURLSandbox = "https://app.sandbox.midtrans.com/snap/v1"
	snapBaseURLProd    = "https://app.midtrans.com/snap/v1"
)

// Client is a Midtrans Snap API client.
type Client struct {
	serverKey string
	isProd    bool
	http      *http.Client
}

// NewClient creates a new Midtrans client.
func NewClient(serverKey string, isProd bool) *Client {
	return &Client{
		serverKey: serverKey,
		isProd:    isProd,
		http:      &http.Client{},
	}
}

// ─── Request / Response types ─────────────────────────────────────────────────

// TransactionDetails holds the basic order information.
type TransactionDetails struct {
	OrderID     string  `json:"order_id"`
	GrossAmount float64 `json:"gross_amount"`
}

// CustomerDetails holds buyer information passed to Midtrans.
type CustomerDetails struct {
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

// SnapRequest is the payload for POST /snap/v1/transactions.
type SnapRequest struct {
	TransactionDetails TransactionDetails `json:"transaction_details"`
	CustomerDetails    *CustomerDetails   `json:"customer_details,omitempty"`
	// Optional: item_details, credit_card, expiry, etc. can be added later.
}

// SnapResponse is the response from POST /snap/v1/transactions.
type SnapResponse struct {
	Token       string   `json:"token"`
	RedirectURL string   `json:"redirect_url"`
	ErrorMessages []string `json:"error_messages,omitempty"`
}

// NotificationPayload is the body Midtrans POSTs to the webhook URL.
type NotificationPayload struct {
	TransactionTime   string   `json:"transaction_time"`
	TransactionStatus string   `json:"transaction_status"`
	TransactionID     string   `json:"transaction_id"`
	StatusCode        string   `json:"status_code"`
	SignatureKey      string   `json:"signature_key"`
	PaymentType       string   `json:"payment_type"`
	OrderID           string   `json:"order_id"`
	MerchantID        string   `json:"merchant_id"`
	GrossAmount       string   `json:"gross_amount"`
	FraudStatus       string   `json:"fraud_status"`
	Currency          string   `json:"currency"`
	VANumbers         []VANumber `json:"va_numbers,omitempty"`
}

// VANumber holds virtual account details returned by Midtrans.
type VANumber struct {
	Bank     string `json:"bank"`
	VANumber string `json:"va_number"`
}

// ─── Methods ──────────────────────────────────────────────────────────────────

// baseURL returns the correct Snap base URL for the environment.
func (c *Client) baseURL() string {
	if c.isProd {
		return snapBaseURLProd
	}
	return snapBaseURLSandbox
}

// authHeader returns the Basic Auth header value (serverKey encoded as base64).
func (c *Client) authHeader() string {
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(c.serverKey+":"))
}

// CreateSnapTransaction calls Midtrans to create a Snap payment token.
func (c *Client) CreateSnapTransaction(req SnapRequest) (*SnapResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("midtrans: marshal request: %w", err)
	}

	httpReq, err := http.NewRequest(http.MethodPost, c.baseURL()+"/transactions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("midtrans: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", c.authHeader())

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("midtrans: http call: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("midtrans: read response: %w", err)
	}

	var snapResp SnapResponse
	if err := json.Unmarshal(respBody, &snapResp); err != nil {
		return nil, fmt.Errorf("midtrans: unmarshal response: %w", err)
	}

	if resp.StatusCode >= 400 {
		errMsg := "unknown error"
		if len(snapResp.ErrorMessages) > 0 {
			errMsg = snapResp.ErrorMessages[0]
		}
		return nil, fmt.Errorf("midtrans: API error %d: %s", resp.StatusCode, errMsg)
	}

	return &snapResp, nil
}

// VerifySignature verifies the Midtrans notification signature.
// Formula: SHA512(order_id + status_code + gross_amount + server_key)
func (c *Client) VerifySignature(orderID, statusCode, grossAmount, signature string) bool {
	raw := orderID + statusCode + grossAmount + c.serverKey
	hash := sha512.Sum512([]byte(raw))
	expected := fmt.Sprintf("%x", hash)
	return expected == signature
}
