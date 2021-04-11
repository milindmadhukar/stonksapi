package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gocolly/colly/v2"
	"github.com/gorilla/mux"
)

var collector *colly.Collector

func getStockStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	stock_data := Get_Stock_Data(collector, params["stock_name"], params["stock_index"])
	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_data)
}

func getStockNews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	stock_news := Get_Stock_News(collector, params["stock_name"], params["stock_index"])
	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_news)
}

func getCryptoData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	crypto_data := Get_Crypto_Data(collector, params["crypto_name"], params["crypto_currency"])
	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*crypto_data)
}

func main() {

	collector = colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
		// colly.CacheDir("./cached_files"),
	)

	collector.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

	//Initialize the mux router
	r := mux.NewRouter()

	// Remove before pushing
	// os.Setenv("PORT", "8000")

	//Creating Route Handlers

	r.HandleFunc("/stocks/{stock_name}:{stock_index}", getStockStats).Methods("GET")
	r.HandleFunc("/stocks/news/{stock_name}:{stock_index}", getStockNews).Methods("GET")
	r.HandleFunc("/crypto/{crypto_name}:{crypto_currency}", getCryptoData).Methods("GET")
	fmt.Println("Listening on the port :", os.Getenv("PORT"))
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", os.Getenv("PORT")), r))
}
