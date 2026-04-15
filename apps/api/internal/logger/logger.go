package logger

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"connectrpc.com/connect"
	"github.com/charmbracelet/log"
	"github.com/google/uuid"
)

var Logger *slog.Logger

func Init(environment string) {
	if environment == "development" {
		Logger = slog.New(log.NewWithOptions(os.Stderr, log.Options{
			Level:           log.DebugLevel,
			ReportTimestamp: true,
		}))
	} else {
		Logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}))
	}
	slog.SetDefault(Logger)
}

func Info(msg string, args ...any) {
	Logger.Info(msg, args...)
}

func Error(msg string, args ...any) {
	Logger.Error(msg, args...)
}

func Warn(msg string, args ...any) {
	Logger.Warn(msg, args...)
}

func NewLoggingInterceptor(logger *slog.Logger) connect.UnaryInterceptorFunc {
	return connect.UnaryInterceptorFunc(func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			reqID := uuid.New().String()

			log := logger.With(
				"request_id", reqID,
				"procedure", req.Spec().Procedure,
			)

			start := time.Now()
			log.Info("Starting RPC")
			res, err := next(ctx, req)
			duration := time.Since(start)

			if err != nil {
				var connectErr *connect.Error
				if errors.As(err, &connectErr) {
					log.Error("RPC Error",
						"code", connectErr.Code(),
						"message", connectErr.Message(),
						"duration_ms", duration.Milliseconds(),
					)
				} else {
					log.Error("RPC Error",
						"code", "unknown",
						"message", err.Error(),
						"duration_ms", duration.Milliseconds(),
					)
				}
			} else {
				log.Info("RPC Success",
					"duration_ms", duration.Milliseconds(),
				)
			}
			return res, err
		}
	})
}
