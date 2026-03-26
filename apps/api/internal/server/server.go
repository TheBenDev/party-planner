package server

import (
	"log/slog"
	"net/http"
	"time"
)

func New(port string, mux *http.ServeMux) *http.Server {

	return &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
}

func Start(srv *http.Server) {
	slog.Info("HTTP server started", "port", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("HTTP server error", "error", err)
	}
}
