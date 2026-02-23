package main

import (
	"testing"

	"github.com/gocolly/colly/v2"
)

func TestSearchStocks(t *testing.T) {
	c := newTestCollector()
	results := Search_Stocks(c, "Tesla")

	if len(*results) == 0 {
		t.Fatal("Expected at least one search result for 'Tesla'")
	}

	foundTSLA := false
	for _, r := range *results {
		if r.Ticker == "" {
			t.Error("Found result with empty ticker")
		}
		if r.Name == "" {
			t.Error("Found result with empty name")
		}
		if r.Exchange == "" {
			t.Error("Found result with empty exchange")
		}
		if r.Ticker == "TSLA" {
			foundTSLA = true
		}
		t.Logf("Result: %s (%s:%s)", r.Name, r.Ticker, r.Exchange)
	}

	if !foundTSLA {
		t.Error("Expected to find TSLA in search results for 'Tesla'")
	}
}

func TestSearchStocksByTicker(t *testing.T) {
	c := newTestCollector()
	results := Search_Stocks(c, "AAPL")

	if len(*results) == 0 {
		t.Fatal("Expected at least one search result for 'AAPL'")
	}

	t.Logf("Got %d results for 'AAPL'", len(*results))
	for _, r := range *results {
		t.Logf("Result: %s (%s:%s)", r.Name, r.Ticker, r.Exchange)
	}
}

func TestSearchStocksInvalid(t *testing.T) {
	c := colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
	)
	c.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

	results := Search_Stocks(c, "XYZINVALIDQUERY99999")

	if len(*results) != 0 {
		t.Fatalf("Expected no results for invalid query, got %d", len(*results))
	}
}
