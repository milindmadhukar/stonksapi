package main

import (
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all tunable parameters for the application.
// Values are loaded from environment variables (typically via .env).
// Every field has a sensible default so the server runs out of the box.
type Config struct {
	// Port the HTTP server listens on.
	Port string

	// --------------- Scraper ------------------------------------------------

	// ScraperParallelism controls how many concurrent scrape requests the
	// Colly collector is allowed to make at the domain level.
	// This is the per-collector limit rule; each clone inherits it.
	ScraperParallelism int

	// --------------- Poller -------------------------------------------------

	// PollInterval is the delay between successive poll cycles.
	// A poll cycle scrapes every subscribed ticker in parallel (bounded by
	// PollWorkers). Lower values = fresher data but more load on Google.
	PollInterval time.Duration

	// PollWorkers is the maximum number of tickers scraped concurrently in
	// a single poll cycle. This is the worker-pool size / semaphore width.
	//
	//   1      – sequential, gentlest on Google
	//   10-50  – good balance for small-to-medium watchlists
	//   100+   – aggressive, for 300+ tickers (make sure your machine and
	//            network can sustain this many outbound connections)
	PollWorkers int

	// --------------- WebSocket ----------------------------------------------

	// WSWriteBufferSize is the WebSocket write buffer in bytes.
	WSWriteBufferSize int

	// WSReadBufferSize is the WebSocket read buffer in bytes.
	WSReadBufferSize int

	// WSClientSendBuffer is the channel buffer size for outbound messages
	// per connected client. If a client can't keep up and this buffer fills,
	// messages are dropped rather than blocking the hub.
	WSClientSendBuffer int

	// --------------- Rate Limiting ------------------------------------------

	// RateLimitRequests is the max number of HTTP requests per IP within
	// RateLimitWindow before the server returns 429.
	RateLimitRequests int

	// RateLimitWindow is the sliding window for the rate limiter.
	RateLimitWindow time.Duration
}

// LoadConfig reads environment variables and returns a Config with defaults
// applied for any values that are missing or invalid.
func LoadConfig() *Config {
	cfg := &Config{
		Port:               envStr("PORT", "8084"),
		ScraperParallelism: envInt("SCRAPER_PARALLELISM", 4),
		PollInterval:       envDuration("POLL_INTERVAL", 5*time.Second),
		PollWorkers:        envInt("POLL_WORKERS", 10),
		WSWriteBufferSize:  envInt("WS_WRITE_BUFFER_SIZE", 1024),
		WSReadBufferSize:   envInt("WS_READ_BUFFER_SIZE", 1024),
		WSClientSendBuffer: envInt("WS_CLIENT_SEND_BUFFER", 256),
		RateLimitRequests:  envInt("RATE_LIMIT_REQUESTS", 30),
		RateLimitWindow:    envDuration("RATE_LIMIT_WINDOW", 1*time.Minute),
	}

	if cfg.Port == "" {
		log.Fatal("PORT must be set")
	}

	return cfg
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Printf("[config] invalid integer for %s=%q, using default %d", key, v, fallback)
		return fallback
	}
	return n
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		log.Printf("[config] invalid duration for %s=%q, using default %s", key, v, fallback)
		return fallback
	}
	return d
}
