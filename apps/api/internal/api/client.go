package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
	apiKey     string
}

type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API error %d: %s", e.StatusCode, e.Message)
}

func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: 5 * time.Second},
		apiKey:     apiKey,
	}
}

func (c *Client) headers() http.Header {
	h := http.Header{}
	h.Set("Authorization", "Bot "+c.apiKey)
	h.Set("User-Agent", "beny-bot/1.0.0")
	h.Set("Content-Type", "application/json")
	return h
}

func (c *Client) Post(path string, body any, result any) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	for k, v := range c.headers() {
		req.Header[k] = v
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute request: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errMsg struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(respBody, &errMsg)
		msg := errMsg.Message
		if msg == "" {
			msg = string(respBody)
		}
		return &APIError{StatusCode: resp.StatusCode, Message: msg}
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("unmarshal response: %w", err)
		}
	}

	return nil
}

func (c *Client) Get(path string, params map[string]string, result any) error {
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return fmt.Errorf("parse URL: %w", err)
	}

	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	for k, v := range c.headers() {
		req.Header[k] = v
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute request: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errMsg struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(respBody, &errMsg)
		msg := errMsg.Message
		if msg == "" {
			msg = string(respBody)
		}
		return &APIError{StatusCode: resp.StatusCode, Message: msg}
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("unmarshal response: %w", err)
		}
	}

	return nil
}

func (c *Client) Delete(path string, body any) error {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequest(http.MethodDelete, c.baseURL+path, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	for k, v := range c.headers() {
		req.Header[k] = v
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute request: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNoContent {
		return nil
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errMsg struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(respBody, &errMsg)
		msg := errMsg.Message
		if msg == "" {
			msg = string(respBody)
		}
		return &APIError{StatusCode: resp.StatusCode, Message: msg}
	}

	return nil
}

func StatusCode(err error) int {
	var apiErr *APIError
	if err == nil {
		return 200
	}
	if ok := isAPIError(err, &apiErr); ok {
		return apiErr.StatusCode
	}
	return 500
}

func isAPIError(err error, target **APIError) bool {
	if err == nil {
		return false
	}
	if e, ok := err.(*APIError); ok {
		*target = e
		return true
	}
	return false
}
