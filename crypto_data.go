package main

import (
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

	url := "https://www.google.com/finance/quote/" + crypto_name + "-" + crypto_currency

	var name string
	var price, previousClose float32

	collector.OnHTML("div.zzDege", func(element *colly.HTMLElement) {
		name = element.Text
	})

	collector.OnHTML("div.YMlKec.fxKbKc", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		// Strip leading currency symbol
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

	// Extract previous close from the stats rows
	collector.OnHTML("div.gyFHrc", func(element *colly.HTMLElement) {
		label := element.ChildText("div.mfs7Fc")
		value := element.ChildText("div.P6K39c")

		if label == "Previous close" {
			cleanVal := strings.ReplaceAll(value, ",", "")
			v, _ := strconv.ParseFloat(cleanVal, 32)
			previousClose = float32(v)
		}
	})

	collector.Visit(url)
	collector.Wait()

	if name == "" {
		return &Crypto_Key_Stats{}
	}

	crypto := Crypto_Key_Stats{
		Name:          name,
		Price:         price,
		PreviousClose: previousClose,
		Change:        price - previousClose,
		ChangePercent: (((price - previousClose) / previousClose) * 100),
	}

	return &crypto
}

func Get_Crypto_News(collector *colly.Collector, crypto_name, crypto_currency string) *[]Crypto_News {

	url := "https://www.google.com/finance/quote/" + crypto_name + "-" + crypto_currency

	allNews := make([]Crypto_News, 0)

	collector.OnHTML("div.nkXTJ", func(element *colly.HTMLElement) {
		title := element.ChildText("div.Yfwt5")
		source := element.ChildText("div.sfyJob")
		articleLink := element.ChildAttr("a", "href")
		thumbnailLink := element.ChildAttr("img.Z4idke", "src")

		if title == "" {
			return
		}

		allNews = append(allNews, Crypto_News{
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
