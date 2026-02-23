package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/gocolly/colly/v2"
	"github.com/joho/godotenv"
)

// Global initialization of Colly collector.
var collector *colly.Collector

func main() {
	// Loading the env file.
	godotenv.Load(".env")

	// Load configuration from environment.
	cfg := LoadConfig()

	// Declaring the colly collector and setting its configurations.
	collector = colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
	)

	collector.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: cfg.ScraperParallelism,
	})

	// Initialing the chi router.
	r := chi.NewRouter()

	// Adding the logger middleware to generate logs.
	r.Use(middleware.Logger)

	// Adding the CORS middleware.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Adding HTTP rate limit on IP.
	r.Use(httprate.LimitByIP(cfg.RateLimitRequests, cfg.RateLimitWindow))

	// Homepage
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Stonks API!"))
	})
	// Stock Search
	r.Get("/stocks/search/{query}", searchStocks)
	// Stock Stats
	r.Get("/stocks/{stock_query}", getStockStats)
	// Stock News
	r.Get("/stocks/news/{stock_query}", getStockNews)
	// Crypto Data
	r.Get("/crypto/{crypto_name}:{crypto_currency}", getCryptoData)
	// Crypto News
	// r.Get("/crypto/news/{crypto_name}:{crypto_currency}", getCryptoNews)

	// WebSocket hub for live updates.
	hub := NewHub(collector, cfg)
	go hub.Run()

	// WebSocket endpoint
	r.Get("/ws", hub.ServeWs)

	log.Printf("Starting the server on port %s (poll_workers=%d, poll_interval=%s, scraper_parallelism=%d)",
		cfg.Port, cfg.PollWorkers, cfg.PollInterval, cfg.ScraperParallelism)

	http.ListenAndServe(fmt.Sprintf(":%s", cfg.Port), r)
}

func getStockStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stock_data := Get_Stock_Data(collector, chi.URLParam(r, "stock_query"))

	// Returning a 404 if the stock data doesn't have a name.
	if stock_data.Name == "" {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No stock data found for the query '%s'.", chi.URLParam(r, "stock_query"))))
		return

	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_data)
}

func getStockNews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stock_news := Get_Stock_News(collector, chi.URLParam(r, "stock_query"))

	// Returning a 404 if no stock news are found.
	if len(*stock_news) == 0 {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No news found for '%s'.", chi.URLParam(r, "stock_query"))))
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_news)
}

func getCryptoData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	crypto_data := Get_Crypto_Data(collector, chi.URLParam(r, "crypto_name"), chi.URLParam(r, "crypto_currency"))

	if crypto_data.Name == "" {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No crypto data found for the query '%s:%s'", chi.URLParam(r, "crypto_name"), chi.URLParam(r, "crypto_currency"))))
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*crypto_data)
}

func searchStocks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	results := Search_Stocks(collector, chi.URLParam(r, "query"))

	if len(*results) == 0 {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No results found for '%s'.", chi.URLParam(r, "query"))))
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*results)
}

func getCryptoNews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	crypto_news := Get_Crypto_News(collector, chi.URLParam(r, "crypto_name"), chi.URLParam(r, "currency"))

	// Returning a 404 if no stock news are found.
	if len(*crypto_news) == 0 {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No news found for the query '%s:%s'", chi.URLParam(r, "crypto_name"), chi.URLParam(r, "crypto_currency"))))
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*crypto_news)
}
