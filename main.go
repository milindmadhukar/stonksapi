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

//Get all books
func getBooks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	stock_data := Get_Stock_Data(collector, params["stock_name"], params["stock_index"])
	enc := json.NewEncoder(w)
	enc.SetIndent("", "    ")
	enc.Encode(*stock_data)
}

func main() {

	collector = colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
		// colly.CacheDir("./cached_files"),
	)

	//Initialize the mux router
	r := mux.NewRouter()

	//Creating Route Handlers

	r.HandleFunc("/{stock_name}:{stock_index}", getBooks).Methods("GET")
	fmt.Println("Listening...")
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", os.Getenv("PORT")), r))
}
