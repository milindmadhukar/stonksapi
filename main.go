package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gocolly/colly/v2"
	"github.com/joho/godotenv"
)

var collector *colly.Collector

func main() {

	err := godotenv.Load(".env")

	if err != nil && os.Getenv("PORT") == "" {
		log.Fatal("Could not load the .env file.")
		return
	}

	collector = colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
		// colly.CacheDir("./cached_files"),
	)

	collector.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Get("/stocks/{stock_name}:{stock_index}", getStockStats)
	r.Get("/stocks/news/{stock_name}:{stock_index}", getStockNews)
	r.Get("/crypto/{crypto_name}:{crypto_currency}", getCryptoData)

	port := os.Getenv("PORT")

	log.Println("Starting the server and listening at Port: ", port)

	http.ListenAndServe(fmt.Sprintf(":%s", port), r)
}

func getStockStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stock_data := Get_Stock_Data(collector, chi.URLParam(r, "stock_name"), chi.URLParam(r, "stock_index"))
	log.Println(stock_data)
	if stock_data.Name == "" {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No stock data found for %s:%s", chi.URLParam(r, "stock_name"), chi.URLParam(r, "stock_index"))))
		return

	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_data)
}

func getStockNews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	stock_news := Get_Stock_News(collector, chi.URLParam(r, "stock_name"), chi.URLParam(r, "stock_index"))

	if len(*stock_news) == 0 {
		w.WriteHeader(404)
		w.Write([]byte(fmt.Sprintf("No news found for %s:%s", chi.URLParam(r, "stock_name"), chi.URLParam(r, "stock_index"))))
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_news)
}

func getCryptoData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	crypto_data := Get_Crypto_Data(collector, chi.URLParam(r, "crypto_name"), chi.URLParam(r, "crypto_currency"))
	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*crypto_data)
}
