package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
)

type Stock_Key_Stats struct {
	Name            string  `json:"name"`
	Price           float32 `json:"price"`
	LastClose       float32 `json:"last_close"`
	Change          float32 `json:"change"`
	ChangePercent   float32 `json:"changepercent"`
	DayRange        string  `json:"day_range"`
	YearRange       string  `json:"year_range"`
	Volume          string  `json:"volume"`
	MarketCap       string  `json:"market_cap"`
	PERatio         float32 `json:"pe_ratio"`
	PrimaryExchange string  `json:"primary_exchange"`
}

func Get_Stock_Data(collector *colly.Collector, stock_name, index string) *Stock_Key_Stats {
	c_time := time.Now()

	url := fmt.Sprintf("https://www.google.com/finance/quote/%s:%s", stock_name, index)

	var name, dayRange, yearRange, volume, marketCap, primaryExchange string
	var price, lastClose, peRatio float32

	collector.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.QZMA8b > c-wiz > div > div:nth-child(1) > div > div.rPF6Lc > div:nth-child(1) > h1", func(element *colly.HTMLElement) {
		name = element.Text
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.Gfxi4 > div:nth-child(2) > div.eYanAe > div:nth-child(2) > div.P6K39c", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(string([]rune(text)[1:]), 32)
		lastClose = float32(value)
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.QZMA8b > c-wiz > div > div:nth-child(1) > div > div.rPF6Lc > div:nth-child(1) > div > div:nth-child(1) > div > span > div > div", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(string([]rune(text)[1:]), 32)
		price = float32(value)
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.Gfxi4 > div:nth-child(2) > div.eYanAe > div:nth-child(3) > div.P6K39c", func(element *colly.HTMLElement) {
		dayRange = element.Text
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.Gfxi4 > div:nth-child(2) > div.eYanAe > div:nth-child(4) > div.P6K39c", func(element *colly.HTMLElement) {
		yearRange = element.Text
	})

	for ctr := 5; ctr <= 12; ctr++ {

		collector.OnHTML(fmt.Sprintf("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.Gfxi4 > div:nth-child(2) > div.eYanAe > div:nth-child(%d)", ctr), func(element *colly.HTMLElement) {
			txt := element.ChildText(".iYuiXc")
			contents := element.ChildText(".P6K39c")
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

	collector.Visit(url)

	collector.Wait()

	stock := Stock_Key_Stats{
		Name:            name,
		Price:           price,
		LastClose:       lastClose,
		Change:          price - lastClose,
		ChangePercent:   (((price - lastClose) / lastClose) * 100),
		DayRange:        dayRange,
		YearRange:       yearRange,
		MarketCap:       marketCap,
		Volume:          volume,
		PERatio:         peRatio,
		PrimaryExchange: primaryExchange,
	}

	fmt.Println(time.Since(c_time))

	return &stock
}
