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

		// Extract exchange from href: "./quote/TSLA:NASDAQ" -> "NASDAQ"
		exchange := ""
		if lastSlash := strings.LastIndex(href, "/"); lastSlash != -1 {
			segment := href[lastSlash+1:]
			if colonIdx := strings.Index(segment, ":"); colonIdx != -1 {
				exchange = segment[colonIdx+1:]
			}
		}

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
