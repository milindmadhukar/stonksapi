package main

import (
	"testing"

	"github.com/gocolly/colly/v2"
)

// newTestCollector creates a collector configured the same way as in main.go
func newTestCollector() *colly.Collector {
	c := colly.NewCollector(
		colly.AllowedDomains("google.com", "www.google.com"),
		colly.MaxDepth(2),
		colly.Async(true),
		colly.AllowURLRevisit(),
	)
	c.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})
	return c
}

func TestGetStockData(t *testing.T) {
	c := newTestCollector()
	data := Get_Stock_Data(c, "TSLA:NASDAQ")

	if data.Name == "" {
		t.Fatal("Expected non-empty stock name for TSLA:NASDAQ")
	}
	if data.Price == 0 {
		t.Fatal("Expected non-zero price for TSLA:NASDAQ")
	}
	if data.PreviousClose == 0 {
		t.Fatal("Expected non-zero previous close for TSLA:NASDAQ")
	}
	if data.PrimaryExchange == "" {
		t.Fatal("Expected non-empty primary exchange for TSLA:NASDAQ")
	}
	if data.MarketCap == "" {
		t.Fatal("Expected non-empty market cap for TSLA:NASDAQ")
	}

	t.Logf("Stock: %s, Price: %.2f, PrevClose: %.2f, Change: %.2f (%.2f%%)",
		data.Name, data.Price, data.PreviousClose, data.Change, data.ChangePercent)
	t.Logf("DayRange: %s, YearRange: %s, Volume: %s, MarketCap: %s, PE: %.2f, Exchange: %s",
		data.DayRange, data.YearRange, data.Volume, data.MarketCap, data.PERatio, data.PrimaryExchange)
}

func TestGetStockDataInvalid(t *testing.T) {
	c := newTestCollector()
	data := Get_Stock_Data(c, "INVALIDTICKER12345:FAKEXCHANGE")

	if data.Name != "" {
		t.Fatalf("Expected empty name for invalid query, got: %s", data.Name)
	}
}

func TestGetStockDataINR(t *testing.T) {
	c := newTestCollector()
	data := Get_Stock_Data(c, "PAYTM:NSE")

	if data.Name == "" {
		t.Fatal("Expected non-empty stock name for PAYTM:NSE")
	}
	if data.Price == 0 {
		t.Fatal("Expected non-zero price for PAYTM:NSE")
	}

	t.Logf("Stock: %s, Price: %.2f, PrevClose: %.2f", data.Name, data.Price, data.PreviousClose)
}

func TestGetStockNews(t *testing.T) {
	c := newTestCollector()
	news := Get_Stock_News(c, "AAPL:NASDAQ")

	if len(*news) == 0 {
		t.Fatal("Expected at least one news item for AAPL:NASDAQ")
	}

	for i, item := range *news {
		if item.Title == "" {
			t.Errorf("News item %d has empty title", i)
		}
		if item.Source == "" {
			t.Errorf("News item %d has empty source", i)
		}
		if item.ArticleLink == "" {
			t.Errorf("News item %d has empty article link", i)
		}
		t.Logf("News[%d]: %s (%s)", i, item.Title, item.Source)
	}
}
