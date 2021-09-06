# Stonks API!

A WIP  API which scrapes [Google Finance](https://finance.google.com) to provide with stocks and crypto data and news.


## 💻 Endpoints
1. `/stocks/{stock_query}` - Provides the current price, previous close, market cap and more.
1. `/stocks/news/{stock_query}` - Provides latest news of the given stock.
1. `/crypto/{crypto_name}:{currency}` - Provides current price, change, previous close and more.

## ️️🛠️ Tools Used

This project was written in `Golang`

The API scrapes [Google Finance](https://finance.google.com) using a module called as [Colly](https://github.com/gocolly/colly). 

The API uses [Chi](https://github.com/go-chi/chi) as a router for all its routes.

## ⛏️  Local Setup

To set the project locally, the following steps are to be followed.
1. Clone the repository. Change your working directory to the root of the project where the `go.mod` file is present and run `go mod tidy` to install all the dependencies.
1. Create a `.env` file in the root directory of the project and paste the following.
```
PORT = 8000
```
1. Run the command `go run .` to start the api or use `go build .` to create an executable and run that.
1. Visit the url `http://127.0.0.1:8000` and try the endpoints as mentioned in [endpoints](#-endpoints).


## 🏁 Examples:

**Request url :** `/stocks/tesla` <br>
**Response :** 
```
{
    "stockName": "Tesla Inc",
    "price": 733.57,
    "previousClose": 732.39,
    "change": 1.1799927,
    "changePercent": 0.16111533,
    "dayRange": "$724.20 - $734.00",
    "yearRange": "$329.88 - $900.40",
    "volume": "18.58M",
    "marketCap": "726.25B USD",
    "peRatio": 383.59,
    "primaryExchange": "NASDAQ"
}
```

**Request url :** `/stocks/news/apple` <br>
**Response :** 
```
[
    {
        "title": "10 Reddit YOLO Stocks That Are Losing Ground",
        "source": "Yahoo Finance",
        "articleLink": "https://finance.yahoo.com/news/10-reddit-yolo-stocks-losing-130727617.html",
        "thumbnailLink": "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcSRLibE2XfHF1Tnwv3t27GIcmRnAElmVPGkqW2lvfYSZ3TU10TMa7ZMFqOT9jk"
    },
    {
        "title": "Apple's stock rises toward another record after Wedbush's Ives sees \ncontinued 'strong' demand for iPhones",
        "source": "MarketWatch",
        "articleLink": "https://www.marketwatch.com/story/apples-stock-rises-toward-another-record-after-webushs-ives-sees-continued-strong-demand-for-iphones-2021-09-03",
        "thumbnailLink": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC4JVI8pP1CiZOKOYme5sBe6WyQL6Z6ouRS15GhIqzkHMftIZNVWHWBFdBPr0"
    },
    {
        "title": "Apple's strategy to fight off antitrust regulators: Fix the App Store one \nrule at a time",
        "source": "CNBC",
        "articleLink": "https://www.cnbc.com/2021/09/05/history-of-apple-giving-ground-on-app-store-rules.html",
        "thumbnailLink": "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcRXx9qr-OikwQ7z5jjfTDg2Q77Ah6HjUGQvF-Uh72M90lMxCOyRhBvSRJ3ysaU"
    },
    {
        "title": "New iPhone 13 buzz gives Apple stock a lift",
        "source": "Fox Business",
        "articleLink": "https://www.foxbusiness.com/markets/apple-iphone13-stock-record-tim-cook",
        "thumbnailLink": "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcTnAnkCG1x8khQYSoht_2nLOKX28IxHBob7kkC6zMUW2hKWRnlZe9Wi8XAQc5o"
    },
    {
        "title": "Tim Cook gets letter from Apple employees demanding changes",
        "source": "Fox Business",
        "articleLink": "https://www.foxbusiness.com/technology/tim-cook-gets-letter-from-apple-employees",
        "thumbnailLink": "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQUSf6COE3uLOMFy0Mfk2NVGQQr_cNW8RwcWuGseq1B09o0pwBsSue9tyYlocI"
    },
    {
        "title": "Apple Should Shed Google and Build Its Own Search Engine",
        "source": "Bloomberg.com",
        "articleLink": "https://www.bloomberg.com/opinion/articles/2021-09-03/fully-charged-apple-should-shed-google-and-build-its-own-search-engine",
        "thumbnailLink": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-KT2enBY6WpZ7olWllovEHcsDdjOJLVthA3MV_QogNj6kDlmeFwCjR3JWtgM"
    }
]
```

**Request url :** `/crypto/btc:usd` <br>
**Response :** 
```
{
    "crypto_name": "BTC / USD",
    "price": 51680.1,
    "previous_close": 51751.5,
    "change": -71.39844,
    "change_percent": -0.137964
}
```

## 🧿 Extras

Don't worry Google Finance allows itself to be scraped and I am not breaking any Terms of Service.

![Finance robots.txt](https://milindm.me/cdn/gfinance.png)

If you face any difficulties contact me [here.](https://milindm.me/contact/)

Thats it, have fun ✚✖
