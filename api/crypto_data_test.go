package main

import (
	"testing"
)

func TestGetCryptoData(t *testing.T) {
	c := newTestCollector()
	data := Get_Crypto_Data(c, "BTC", "USD")

	if data.Name == "" {
		t.Fatal("Expected non-empty crypto name for BTC-USD")
	}
	if data.Price == 0 {
		t.Fatal("Expected non-zero price for BTC-USD")
	}
	if data.PreviousClose == 0 {
		t.Fatal("Expected non-zero previous close for BTC-USD")
	}

	t.Logf("Crypto: %s, Price: %.2f, PrevClose: %.2f, Change: %.2f (%.2f%%)",
		data.Name, data.Price, data.PreviousClose, data.Change, data.ChangePercent)
}

func TestGetCryptoDataInvalid(t *testing.T) {
	c := newTestCollector()
	data := Get_Crypto_Data(c, "FAKECOIN999", "ZZZZ")

	if data.Name != "" {
		t.Fatalf("Expected empty name for invalid crypto query, got: %s", data.Name)
	}
}

func TestGetCryptoNews(t *testing.T) {
	c := newTestCollector()
	news := Get_Crypto_News(c, "BTC", "USD")

	if len(*news) == 0 {
		t.Fatal("Expected at least one news item for BTC-USD")
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
