package middleware

import (
	"log/slog"
	"net/http"
)

func WithInternalAPIKey(apiKey string, logger *slog.Logger, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			h.ServeHTTP(w, r)
			return
		}
		reqKey := r.Header.Get("X-Internal-Api-Key")
		if apiKey == "" || apiKey != reqKey {
			logger.Error("Unauthorized request",
				"path", r.URL.Path,
				"method", r.Method,
				"remote_addr", r.RemoteAddr,
				"has_key", reqKey != "",
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		h.ServeHTTP(w, r)
	})
}
