package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
)

type Crypto_Key_Stats struct {
	Name          string  `json:"crypto_name"`
	Description   string  `json:"description"`
	Price         float32 `json:"price"`
	PreviousClose float32 `json:"previous_close"`
	Change        float32 `json:"change"`
	ChangePercent float32 `json:"change_percent"`
}

func Get_Crypto_Data(collector *colly.Collector, crypto_name, crypto_currency string) *Crypto_Key_Stats {
	c_time := time.Now()

	url := fmt.Sprintf("https://www.google.com/finance/quote/%s-%s", strings.ToUpper(crypto_name), strings.ToUpper(crypto_currency))

	var name, description string
	var price, previousClose float32

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.QZMA8b > c-wiz > div > div:nth-child(1) > div > div.rPF6Lc > div:nth-child(1) > h1", func(element *colly.HTMLElement) {
		name = element.Text
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.QZMA8b > c-wiz > div > div:nth-child(1) > div > div.rPF6Lc > div:nth-child(1) > h2", func(element *colly.HTMLElement) {
		description = element.Text
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.Gfxi4 > div:nth-child(2) > div.eYanAe > div > div.P6K39c", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(text, 32)
		previousClose = float32(value)
	})

	collector.OnHTML("#yDmH0d > c-wiz > div > div.e1AOyf > main > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.QZMA8b > c-wiz > div > div:nth-child(1) > div > div.rPF6Lc > div:nth-child(1) > div > div:nth-child(1) > div > span > div > div", func(element *colly.HTMLElement) {
		text := strings.ReplaceAll(element.Text, ",", "")
		value, _ := strconv.ParseFloat(text, 32)
		price = float32(value)
		fmt.Println("Price", price)
	})

	collector.Visit(url)

	collector.Wait()

	fmt.Println(name, description, previousClose, price)

	crypto := Crypto_Key_Stats{
		Name:          name,
		Description:   description,
		Price:         price,
		PreviousClose: previousClose,
		Change:        price - previousClose,
		ChangePercent: (((price - previousClose) / previousClose) * 100),
	}

	fmt.Println(time.Since(c_time))

	return &crypto
}
