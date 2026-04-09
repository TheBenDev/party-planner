package middleware

import (
	"net/http"

	connectcors "connectrpc.com/cors"
	"github.com/rs/cors"
)

// withCORS adds CORS support to a Connect HTTP handler.
func WithCORS(allowedOrigins []string, h http.Handler) http.Handler {
	return cors.New(cors.Options{
		AllowCredentials: true,
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   connectcors.AllowedMethods(),
		AllowedHeaders:   connectcors.AllowedHeaders(),
		ExposedHeaders:   connectcors.ExposedHeaders(),
	}).Handler(h)
}
