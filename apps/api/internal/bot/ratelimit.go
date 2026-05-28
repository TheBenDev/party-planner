package bot

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// 5 commands per 10 seconds, burst of 3.
const (
	botRateEvery = 2 * time.Second
	botRateBurst = 3
)

type botUserLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	botMu       sync.Mutex
	botLimiters = map[string]*botUserLimiter{}
)

func init() {
	go func() {
		for range time.Tick(time.Minute) {
			botMu.Lock()
			for id, ul := range botLimiters {
				if time.Since(ul.lastSeen) > 5*time.Minute {
					delete(botLimiters, id)
				}
			}
			botMu.Unlock()
		}
	}()
}

func allowBotUser(userID string) bool {
	botMu.Lock()
	defer botMu.Unlock()

	ul, ok := botLimiters[userID]
	if !ok {
		ul = &botUserLimiter{
			limiter: rate.NewLimiter(rate.Every(botRateEvery), botRateBurst),
		}
		botLimiters[userID] = ul
	}
	ul.lastSeen = time.Now()
	return ul.limiter.Allow()
}
