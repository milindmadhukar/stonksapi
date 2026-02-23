package main

import (
	"strings"

	"github.com/gocolly/colly/v2"
)

type SearchResult struct {
	Ticker   string `json:"ticker"`
	Name     string `json:"name"`
	Exchange string `json:"exchange"`
}

func Search_Stocks(collector *colly.Collector, query string) *[]SearchResult {

	url := "https://www.google.com/finance/quote/" + query

	results := make([]SearchResult, 0)

	collector.OnHTML("a", func(element *colly.HTMLElement) {
		href := element.Attr("href")

		// Only process links to quote pages (e.g. "./quote/TSLA:NASDAQ")
		if !strings.Contains(href, "/quote/") {
			return
		}

		ticker := element.ChildText("div.COaKTb")
		name := element.ChildText("div.ZvmM7")

		if ticker == "" || name == "" {
			return
		}

		// Extract the full segment after the last "/" in the href.
		// Examples:
		//   "./quote/TSLA:NASDAQ"      -> segment = "TSLA:NASDAQ"
		//   "./quote/.DJI:INDEXDJX"    -> segment = ".DJI:INDEXDJX"
		//   "./quote/BTC-USD"          -> segment = "BTC-USD"
		exchange := ""
		hrefTicker := ""
		if lastSlash := strings.LastIndex(href, "/"); lastSlash != -1 {
			segment := href[lastSlash+1:]
			if colonIdx := strings.Index(segment, ":"); colonIdx != -1 {
				hrefTicker = segment[:colonIdx]
				exchange = segment[colonIdx+1:]
			} else if dashIdx := strings.Index(segment, "-"); dashIdx != -1 {
				// Crypto: "BTC-USD" -> ticker="BTC", exchange="USD"
				hrefTicker = segment[:dashIdx]
				exchange = segment[dashIdx+1:]
			}
		}

		// For indices, Google shows "Index" as the display text instead of
		// the actual symbol (e.g. ".DJI"). Use the href-parsed ticker.
		if ticker == "Index" && hrefTicker != "" {
			ticker = hrefTicker
		}
		// For crypto, the DOM ticker is just the coin name (e.g. "BTC")
		// which matches hrefTicker, so no override needed.

		results = append(results, SearchResult{
			Ticker:   ticker,
			Name:     name,
			Exchange: exchange,
		})
	})

	collector.Visit(url)
	collector.Wait()

	return &results
}
