package middleware

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	"connectrpc.com/connect"
	"golang.org/x/time/rate"
)

var (
	ErrGlobalRateLimit = connect.NewError(connect.CodeResourceExhausted, errors.New("server is overloaded, try again later"))
	ErrUserRateLimit   = connect.NewError(connect.CodeResourceExhausted, errors.New("rate limit exceeded"))
)

// Global limiter — protects the entire server
var globalLimiter = rate.NewLimiter(rate.Every(time.Second/500), 100) // 500 req/s, burst 100

// userLimiter — protects the server from a specific user
type userLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	mu       sync.Mutex
	limiters = map[string]*userLimiter{}
)

func init() {
	go func() {
		for range time.Tick(time.Minute) {
			mu.Lock()
			for id, ul := range limiters {
				// if we haven't seen this user in 5 minutes, remove them
				if time.Since(ul.lastSeen) > 5*time.Minute {
					delete(limiters, id)
				}
			}
			mu.Unlock()
		}
	}()
}

func getUserLimiter(userID string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	if ul, ok := limiters[userID]; ok {
		// update lastSeen every time the user makes a request
		ul.lastSeen = time.Now()
		return ul.limiter
	}

	lim := rate.NewLimiter(rate.Every(time.Second/10), 20)
	limiters[userID] = &userLimiter{
		limiter:  lim,
		lastSeen: time.Now(),
	}
	return lim
}

func NewRateLimitInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {

			// 1. Global limit
			if !globalLimiter.Allow() {
				return nil, ErrGlobalRateLimit
			}

			// 2. Per-user limit
			userID := req.Header().Get("Authorization")
			if userID == "" {
				userID = req.Header().Get("X-Real-Ip")
			}
			if userID != "" {
				if !getUserLimiter(userID).Allow() {
					return nil, ErrUserRateLimit
				}
			}

			return next(ctx, req)
		}
	}
}
