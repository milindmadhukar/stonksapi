package main

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gocolly/colly/v2"
)

type Crypto_Key_Stats struct {
	Name          string  `json:"cryptoName,omitempty"`
	Price         float32 `json:"price,omitempty"`
	PreviousClose float32 `json:"previousClose,omitempty"`
	Change        float32 `json:"change,omitempty"`
	ChangePercent float32 `json:"changePercent,omitempty"`
}

type Crypto_News struct {
	Title          string `json:"title,omitempty"`
	Source         string `json:"source,omitempty"`
	ArticleLink    string `json:"articleLink,omitempty"`
	Thumbnail_Link string `json:"thumbnailLink,omitempty"`
}

func Get_Crypto_Data(collector *colly.Collector, crypto_name, crypto_currency string) *Crypto_Key_Stats {

	url := fmt.Sprintf("https://www.google.com/finance/quote/%s-%s", crypto_name, crypto_currency)

	var name string
	var price, previousClose float32

	collector.Visit(url)

	collector.OnHTML(".zzDege", func(element *colly.HTMLElement) {
		name = element.Text
	})

	collector.OnHTML("div.P6K39c", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(text, 32)
		previousClose = float32(value)
	})

	collector.OnHTML("div.YMlKec.fxKbKc", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(text, 32)
		price = float32(value)
	})

	collector.Wait()

	crypto := Crypto_Key_Stats{
		Name:          name,
		Price:         price,
		PreviousClose: previousClose,
		Change:        price - previousClose,
		ChangePercent: (((price - previousClose) / previousClose) * 100),
	}

	return &crypto
}
