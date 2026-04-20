package anthropic

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	apiURL    = "https://api.anthropic.com/v1/messages"
	modelName = "claude-haiku-4-5"
)

// Client wraps the Anthropic Messages API.
type Client struct {
	apiKey string
	http   *http.Client
}

// NewClient creates a new Anthropic client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		http:   &http.Client{Timeout: 30 * time.Second},
	}
}

// message is an Anthropic API message.
type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// apiRequest is the Anthropic Messages API request body.
type apiRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system"`
	Messages  []message `json:"messages"`
}

// contentBlock is one content block in the API response.
type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// apiResponse is the Anthropic Messages API response envelope.
type apiResponse struct {
	Content []contentBlock `json:"content"`
	Error   *apiError      `json:"error,omitempty"`
}

type apiError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// Complete sends a system prompt + user message and returns Claude's text reply.
func (c *Client) Complete(ctx context.Context, systemPrompt, userMessage string) (string, error) {
	body := apiRequest{
		Model:     modelName,
		MaxTokens: 2048,
		System:    systemPrompt,
		Messages: []message{
			{Role: "user", Content: userMessage},
		},
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal anthropic request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("build anthropic request: %w", err)
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("send anthropic request: %w", err)
	}
	defer resp.Body.Close()

	var result apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode anthropic response: %w", err)
	}

	if result.Error != nil {
		return "", fmt.Errorf("anthropic API error: %s", result.Error.Message)
	}
	if len(result.Content) == 0 {
		return "", fmt.Errorf("empty response from Anthropic")
	}

	return result.Content[0].Text, nil
}
