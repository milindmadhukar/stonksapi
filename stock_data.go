package main

import (
	"fmt"
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

	url := fmt.Sprintf("https://finance.google.com/finance?q=%s", stock_query)

	var name, dayRange, yearRange, volume, marketCap, primaryExchange string
	var price, previousClose, peRatio float32

	collector.Visit(url)

	collector.OnHTML("div.zzDege", func(element *colly.HTMLElement) {
		name = element.Text
	})

	collector.OnHTML("div.eYanAe > div:nth-child(2) > div", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(string([]rune(text)[1:]), 32)
		previousClose = float32(value)
	})

	collector.OnHTML("div.YMlKec.fxKbKc", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(string([]rune(text)[1:]), 32)
		price = float32(value)
	})

	collector.OnHTML("div.eYanAe > div:nth-child(3) > div.P6K39c", func(element *colly.HTMLElement) {
		dayRange = element.Text
	})

	collector.OnHTML("div.eYanAe > div:nth-child(4) > div.P6K39c", func(element *colly.HTMLElement) {
		yearRange = element.Text
	})

	for ctr := 5; ctr <= 12; ctr++ {

		collector.OnHTML(fmt.Sprintf("div.eYanAe > div:nth-child(%d)", ctr), func(element *colly.HTMLElement) {
			txt := element.ChildText("div.mfs7Fc")
			contents := element.ChildText("div.P6K39c")
			if txt == "Volume" {
				volume = contents
			} else if txt == "P/E ratio" {
				value, _ := strconv.ParseFloat(strings.ReplaceAll(contents, ",", ""), 32)
				peRatio = float32(value)
			} else if txt == "Primary exchange" {
				primaryExchange = contents
			} else if txt == "Market cap" {
				marketCap = contents
			}
		})
	}

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

	url := fmt.Sprintf("https://finance.google.com/finance?q=%s", stock_query)

	var title, source, articleLink, thumbnailLink string
	allNews := make([]Stock_News, 0)

	collector.Visit(url)

	collector.OnHTML("div.nkXTJ", func(element *colly.HTMLElement) {
		title = element.ChildText("div.AoCdqe")
		source = element.ChildText("div.nkXTJ.W8knGc > div.sfyJob")
		articleLink = element.ChildAttr("div.z4rs2b > a:nth-child(1)", "href")
		thumbnailLink = element.ChildAttr("img.PgYz9d", "src")

		if title == "" {
			return
		}

		allNews = append(allNews, Stock_News{
			Title:          title,
			Source:         source,
			ArticleLink:    articleLink,
			Thumbnail_Link: thumbnailLink})
	})

	collector.Wait()

	return &allNews
}
