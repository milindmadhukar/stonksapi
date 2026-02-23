package main

import (
	"strconv"
	"strings"

	"github.com/gocolly/colly/v2"
)

type Stock_Key_Stats struct {
	Name            string  `json:"stockName,omitempty"`
	Price           float32 `json:"price,omitempty"`
	PreviousClose   float32 `json:"previousClose,omitempty"`
	Change          float32 `json:"change,omitempty"`
	ChangePercent   float32 `json:"changePercent,omitempty"`
	DayRange        string  `json:"dayRange,omitempty"`
	YearRange       string  `json:"yearRange,omitempty"`
	Volume          string  `json:"volume,omitempty"`
	MarketCap       string  `json:"marketCap,omitempty"`
	PERatio         float32 `json:"peRatio,omitempty"`
	PrimaryExchange string  `json:"primaryExchange,omitempty"`
}

type Stock_News struct {
	Title          string `json:"title,omitempty"`
	Source         string `json:"source,omitempty"`
	ArticleLink    string `json:"articleLink,omitempty"`
	Thumbnail_Link string `json:"thumbnailLink,omitempty"`
}

func Get_Stock_Data(collector *colly.Collector, stock_query string) *Stock_Key_Stats {

	url := "https://www.google.com/finance/quote/" + stock_query

	var name string
	var price, previousClose, peRatio float32
	var dayRange, yearRange, volume, marketCap, primaryExchange string

	collector.OnHTML("div.zzDege", func(element *colly.HTMLElement) {
		name = element.Text
	})

	collector.OnHTML("div.YMlKec.fxKbKc", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		// Strip leading currency symbol (e.g. $, ₹, €)
		runes := []rune(text)
		for i, r := range runes {
			if (r >= '0' && r <= '9') || r == '.' || r == '-' {
				text = string(runes[i:])
				break
			}
		}
		value, _ := strconv.ParseFloat(text, 32)
		price = float32(value)
	})

	// Extract stats from the label-value row pairs
	collector.OnHTML("div.gyFHrc", func(element *colly.HTMLElement) {
		label := element.ChildText("div.mfs7Fc")
		value := element.ChildText("div.P6K39c")

		switch label {
		case "Previous close":
			cleanVal := strings.ReplaceAll(value, ",", "")
			// Strip leading currency symbol
			runes := []rune(cleanVal)
			for i, r := range runes {
				if (r >= '0' && r <= '9') || r == '.' || r == '-' {
					cleanVal = string(runes[i:])
					break
				}
			}
			v, _ := strconv.ParseFloat(cleanVal, 32)
			previousClose = float32(v)
		case "Day range":
			dayRange = value
		case "Year range":
			yearRange = value
		case "Market cap":
			marketCap = value
		case "Volume", "Avg Volume":
			volume = value
		case "P/E ratio":
			v, _ := strconv.ParseFloat(strings.ReplaceAll(value, ",", ""), 32)
			peRatio = float32(v)
		case "Primary exchange":
			primaryExchange = value
		}
	})

	collector.Visit(url)
	collector.Wait()

	if name == "" {
		return &Stock_Key_Stats{}
	}

	stock := Stock_Key_Stats{
		Name:            name,
		Price:           price,
		PreviousClose:   previousClose,
		Change:          price - previousClose,
		ChangePercent:   (((price - previousClose) / previousClose) * 100),
		DayRange:        dayRange,
		YearRange:       yearRange,
		MarketCap:       marketCap,
		Volume:          volume,
		PERatio:         peRatio,
		PrimaryExchange: primaryExchange,
	}

	return &stock
}

func Get_Stock_News(collector *colly.Collector, stock_query string) *[]Stock_News {

	url := "https://www.google.com/finance/quote/" + stock_query

	allNews := make([]Stock_News, 0)

	collector.OnHTML("div.nkXTJ", func(element *colly.HTMLElement) {
		title := element.ChildText("div.Yfwt5")
		source := element.ChildText("div.sfyJob")
		articleLink := element.ChildAttr("a", "href")
		thumbnailLink := element.ChildAttr("img.Z4idke", "src")

		if title == "" {
			return
		}

		allNews = append(allNews, Stock_News{
			Title:          title,
			Source:         source,
			ArticleLink:    articleLink,
			Thumbnail_Link: thumbnailLink,
		})
	})

	collector.Visit(url)
	collector.Wait()

	return &allNews
}
