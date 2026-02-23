package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"github.com/gocolly/colly/v2"
)

func setupTestRouter() http.Handler {
	collector = colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
	)
	collector.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(httprate.LimitByIP(30, 1*time.Minute))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Stonks API!"))
	})
	r.Get("/stocks/search/{query}", searchStocks)
	r.Get("/stocks/{stock_query}", getStockStats)
	r.Get("/stocks/news/{stock_query}", getStockNews)
	r.Get("/crypto/{crypto_name}:{crypto_currency}", getCryptoData)

	return r
}

func TestHomepage(t *testing.T) {
	router := setupTestRouter()
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", rr.Code)
	}
	if rr.Body.String() != "Stonks API!" {
		t.Fatalf("Expected 'Stonks API!', got: %s", rr.Body.String())
	}
}

func TestStockEndpoint(t *testing.T) {
	router := setupTestRouter()
	req := httptest.NewRequest("GET", "/stocks/TSLA:NASDAQ", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var data Stock_Key_Stats
	if err := json.Unmarshal(rr.Body.Bytes(), &data); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if data.Name == "" {
		t.Fatal("Expected non-empty stock name in response")
	}
	if data.Price == 0 {
		t.Fatal("Expected non-zero price in response")
	}

	t.Logf("Endpoint returned: %s @ %.2f", data.Name, data.Price)
}

func TestStockNewsEndpoint(t *testing.T) {
	router := setupTestRouter()
	req := httptest.NewRequest("GET", "/stocks/news/AAPL:NASDAQ", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var news []Stock_News
	if err := json.Unmarshal(rr.Body.Bytes(), &news); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if len(news) == 0 {
		t.Fatal("Expected at least one news item")
	}

	t.Logf("Got %d news items", len(news))
}

func TestCryptoEndpoint(t *testing.T) {
	router := setupTestRouter()
	req := httptest.NewRequest("GET", "/crypto/BTC:USD", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var data Crypto_Key_Stats
	if err := json.Unmarshal(rr.Body.Bytes(), &data); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if data.Name == "" {
		t.Fatal("Expected non-empty crypto name in response")
	}
	if data.Price == 0 {
		t.Fatal("Expected non-zero price in response")
	}

	t.Logf("Endpoint returned: %s @ %.2f", data.Name, data.Price)
}

func TestInvalidStockEndpoint(t *testing.T) {
	router := setupTestRouter()
	req := httptest.NewRequest("GET", "/stocks/INVALIDXYZ99:FAKE", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("Expected status 404 for invalid stock, got %d", rr.Code)
	}
}

func TestSearchEndpoint(t *testing.T) {
	router := setupTestRouter()
	req := httptest.NewRequest("GET", "/stocks/search/Tesla", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var results []SearchResult
	if err := json.Unmarshal(rr.Body.Bytes(), &results); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if len(results) == 0 {
		t.Fatal("Expected at least one search result")
	}

	t.Logf("Got %d search results", len(results))
	for _, r := range results {
		t.Logf("  %s (%s:%s)", r.Name, r.Ticker, r.Exchange)
	}
}
