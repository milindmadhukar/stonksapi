package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

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

	port := os.Getenv("PORT")

	if port == "" {
		log.Fatal("Could not find a port to run the server.")
		return
	}

	// Declaring the colly collector and setting its configurations.
	collector = colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com", "finance.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
		// colly.CacheDir("./cached_files"),
	)

	collector.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

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
	r.Use(httprate.LimitByIP(30, 1*time.Minute))

	// Homepage
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Stonks API!"))
	})
	// Stock Stats
	r.Get("/stocks/{stock_query}", getStockStats)
	// Stock News
	r.Get("/stocks/news/{stock_query}", getStockNews)
	// Crypto Data
	r.Get("/crypto/{crypto_name}:{crypto_currency}", getCryptoData)
	// Crypto News
	// r.Get("/crypto/news/{crypto_name}:{crypto_currency}", getCryptoNews)
	log.Println("Starting the server and listening at Port: ", port)

	http.ListenAndServe(fmt.Sprintf(":%s", port), r)
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
