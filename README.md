# Stonks API!

A WIP  API which scrapes [Google Finance](https://www.google.com/finance) to provide with stocks and crypto data and news.

This is a monorepo containing both the **API** and the **Dashboard**.

| Directory | Description | Deployment |
|-----------|-------------|------------|
| [`api/`](./api) | Go API — scrapes Google Finance, serves REST + WebSocket endpoints | Docker (self-hosted) |
| [`dashboard/`](./dashboard) | Astro + Tailwind frontend — real-time stock dashboard | Vercel |

## 💻 Endpoints
1. `/stocks/search/{query}` - Search for stocks by name or ticker. Returns matching stocks with their ticker symbol, exchange and company name.
1. `/stocks/{symbol}:{exchange}` - Provides the current price, previous close, market cap and more.
1. `/stocks/news/{symbol}:{exchange}` - Provides latest news of the given stock.
1. `/indexes/{index_name}:{index_exchange}` - Provides current value, previous close, day/year range for market indexes.
1. `/crypto/{crypto_name}:{currency}` - Provides current price, change, previous close and more.
1. `/ws` - WebSocket endpoint for live stock/crypto price updates (see [WebSocket docs](#websocket--live-updates)).

## ️️🛠️ Tools Used

This project was written in `Golang`

The API scrapes [Google Finance](https://www.google.com/finance) using a module called as [Colly](https://github.com/gocolly/colly). 

The API uses [Chi](https://github.com/go-chi/chi) as a router for all its routes.

Real-time updates are served over WebSocket using [Gorilla WebSocket](https://github.com/gorilla/websocket).

## ⛏️  Local Setup

To set the project locally, the following steps are to be followed.
1. Clone the repository. Change your working directory to the `api/` folder where the `go.mod` file is present and run `go mod tidy` to install all the dependencies.
1. Create a `.env` file in the `api/` directory of the project and paste the following.
```
PORT = 8000
```
1. Run the command `go run .` to start the api or use `go build .` to create an executable and run that.
1. Visit the url `http://127.0.0.1:8000` and try the endpoints as mentioned in [endpoints](#-endpoints).

### Dashboard Setup
1. `cd dashboard && bun install`
2. Create a `.env` file: `PUBLIC_BACKEND_URL=localhost:8084`
3. `bun dev` — starts at `localhost:4321`


## 🏁 Examples:

**Request url :** `/stocks/search/Tesla` <br>
**Response :**
```json
[
    {
        "ticker": "TSLA",
        "name": "Tesla Inc",
        "exchange": "NASDAQ"
    },
    {
        "ticker": "0R0X",
        "name": "Tesla Inc",
        "exchange": "LON"
    },
    {
        "ticker": "TL0",
        "name": "Tesla Inc",
        "exchange": "ETR"
    },
    {
        "ticker": "TXLZF",
        "name": "Tesla Exploration Ltd",
        "exchange": "OTCMKTS"
    }
]
```
Clients can use the returned `ticker` and `exchange` to query the stock data endpoint, e.g. `/stocks/TSLA:NASDAQ`.

---

**Request url :** `/stocks/TSLA:NASDAQ` <br>
**Response :** 
```json
{
    "stockName": "Tesla Inc",
    "price": 398.41,
    "previousClose": 411.82,
    "change": -13.41,
    "changePercent": -3.26,
    "dayRange": "$396.62 - $407.70",
    "yearRange": "$214.25 - $498.82",
    "volume": "60.08M",
    "marketCap": "1.25T USD",
    "peRatio": 370.57,
    "primaryExchange": "NASDAQ"
}
```

**Request url :** `/stocks/news/AAPL:NASDAQ` <br>
**Response :** 
```json
[
    {
        "title": "Apple's Stock Recovery Is No Recovery At All",
        "source": "Yahoo Finance",
        "articleLink": "https://finance.yahoo.com/news/apples-stock-recovery-is-no-recovery-at-all.html",
        "thumbnailLink": "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcSRLibE2XfHF1Tnwv3t27GIcmRnAElmVPGkqW2lvfYSZ3TU10TMa7ZMFqOT9jk"
    }
]
```

---

**Request url :** `/indexes/NIFTY_50:INDEXNSE` <br>
**Response :**
```json
{
    "stockName": "NIFTY 50",
    "price": 25713,
    "previousClose": 25571.25,
    "change": 141.75,
    "changePercent": 0.55,
    "dayRange": "25,609.35 - 25,771.45",
    "yearRange": "21,743.65 - 26,373.20"
}
```
Index identifiers use the format `INDEX_NAME:INDEX_EXCHANGE`. Common examples:
- `NIFTY_50:INDEXNSE` — Nifty 50
- `SENSEX:INDEXBOM` — BSE Sensex
- `NDX:INDEXNASDAQ` — Nasdaq-100
- `.DJI:INDEXDJX` — Dow Jones Industrial Average
- `.INX:INDEXSP` — S&P 500

---

**Request url :** `/crypto/BTC:USD` <br>
**Response :** 
```json
{
    "cryptoName": "Bitcoin (BTC / USD)",
    "price": 65412.06,
    "previousClose": 67668.43,
    "change": -2256.37,
    "changePercent": -3.33
}
```

## WebSocket – Live Updates

### Overview

The `/ws` endpoint provides a persistent WebSocket connection for receiving real-time stock, index and crypto price updates. The server maintains an in-memory store of all subscribed tickers. A background poller scrapes fresh data every 5 seconds and pushes updates to connected clients **only when values change**.

**Architecture:**

```
Client A ──┐                  ┌── Google Finance
Client B ──┤◄──► Hub (state) ─┤   (scraper)
Client C ──┘                  └── polls every 5s
```

- All state is **in-memory only** (no persistence).
- Tickers are only polled while at least one client is subscribed to them.
- When the last subscriber for a ticker disconnects or unsubscribes, the ticker is removed from the store and polling stops for it.

### Connecting

```
ws://localhost:8084/ws
```

No authentication is required. The connection is upgraded from a standard HTTP GET request.

### Client Messages (you send)

All messages are JSON with two fields:

| Field    | Type   | Description |
|----------|--------|-------------|
| `action` | string | `"subscribe"` or `"unsubscribe"` |
| `ticker` | string | Ticker identifier (see format below) |

**Ticker format:**
- Stocks: `SYMBOL:EXCHANGE` (e.g. `TSLA:NASDAQ`, `PAYTM:NSE`, `AAPL:NASDAQ`)
- Indexes: `INDEX_NAME:INDEX_EXCHANGE` (e.g. `NIFTY_50:INDEXNSE`, `NDX:INDEXNASDAQ`, `.DJI:INDEXDJX`)
- Crypto: `NAME-CURRENCY` (e.g. `BTC-USD`, `ETH-USD`)

**Subscribe example:**
```json
{"action": "subscribe", "ticker": "TSLA:NASDAQ"}
```

**Unsubscribe example:**
```json
{"action": "unsubscribe", "ticker": "TSLA:NASDAQ"}
```

You can subscribe to multiple tickers by sending multiple subscribe messages.

### Server Messages (you receive)

All server messages are JSON with this shape:

| Field       | Type   | Description |
|-------------|--------|-------------|
| `type`      | string | Message type (see below) |
| `ticker`    | string | The ticker this message relates to |
| `data`      | object | The full stock/crypto data (on updates) |
| `error`     | string | Error description (on errors) |
| `timestamp` | string | ISO 8601 timestamp of the event |

**Message types:**

| Type             | When sent |
|------------------|-----------| 
| `subscribed`     | Acknowledgement after a successful subscribe |
| `unsubscribed`   | Acknowledgement after a successful unsubscribe |
| `stock_update`   | Stock data changed (pushed automatically) |
| `index_update`   | Index data changed (pushed automatically) |
| `crypto_update`  | Crypto data changed (pushed automatically) |
| `error`          | Invalid message format or unknown action |

### Data Payloads

**`stock_update` data:**
```json
{
    "type": "stock_update",
    "ticker": "TSLA:NASDAQ",
    "data": {
        "stockName": "Tesla Inc",
        "price": 398.41,
        "previousClose": 411.82,
        "change": -13.41,
        "changePercent": -3.26,
        "dayRange": "$396.62 - $407.70",
        "yearRange": "$214.25 - $498.82",
        "volume": "60.08M",
        "marketCap": "1.25T USD",
        "peRatio": 370.57,
        "primaryExchange": "NASDAQ"
    },
    "timestamp": "2026-02-23T12:00:05Z"
}
```

**`crypto_update` data:**
```json
{
    "type": "crypto_update",
    "ticker": "BTC-USD",
    "data": {
        "cryptoName": "Bitcoin (BTC / USD)",
        "price": 65412.06,
        "previousClose": 67668.43,
        "change": -2256.37,
        "changePercent": -3.33
    },
    "timestamp": "2026-02-23T12:00:05Z"
}
```

**`index_update` data:**
```json
{
    "type": "index_update",
    "ticker": "NIFTY_50:INDEXNSE",
    "data": {
        "stockName": "NIFTY 50",
        "price": 25713,
        "previousClose": 25571.25,
        "change": 141.75,
        "changePercent": 0.55,
        "dayRange": "25,609.35 - 25,771.45",
        "yearRange": "21,743.65 - 26,373.20"
    },
    "timestamp": "2026-02-23T12:00:05Z"
}
```

### Full Client Example (JavaScript)

```javascript
const ws = new WebSocket("ws://localhost:8084/ws");

ws.onopen = () => {
    console.log("Connected to StonksAPI");

    // Subscribe to stocks, indexes and crypto
    ws.send(JSON.stringify({ action: "subscribe", ticker: "TSLA:NASDAQ" }));
    ws.send(JSON.stringify({ action: "subscribe", ticker: "NIFTY_50:INDEXNSE" }));
    ws.send(JSON.stringify({ action: "subscribe", ticker: "BTC-USD" }));
};

ws.onmessage = (event) => {
    // Note: multiple JSON messages may arrive newline-delimited in a
    // single WebSocket frame when the server batches queued updates.
    const parts = event.data.split("\n");
    for (const part of parts) {
        const msg = JSON.parse(part);

        switch (msg.type) {
            case "subscribed":
                console.log(`Subscribed to ${msg.ticker}`);
                break;
            case "stock_update":
            case "index_update":
                // Update your dashboard with msg.data
                console.log(`${msg.ticker}: $${msg.data.price} (${msg.data.changePercent}%)`);
                break;
            case "crypto_update":
                console.log(`${msg.ticker}: $${msg.data.price} (${msg.data.changePercent}%)`);
                break;
            case "error":
                console.error(`Error: ${msg.error}`);
                break;
        }
    }
};

ws.onclose = () => {
    console.log("Disconnected – implement reconnection logic here");
};
```

### Dashboard Integration Notes

- **Initial data**: On subscribe, if the server already has data for that ticker (another client subscribed earlier), it is sent immediately. Otherwise the first update arrives after the next poll cycle (~5 seconds).
- **Change detection**: The server only pushes when scraped data differs from the stored value, so idle tickers produce no traffic.
- **Reconnection**: The server does not persist subscriptions. On reconnect, clients must re-subscribe to all tickers.
- **Ping/pong**: The server sends WebSocket pings every ~54 seconds. Clients that don't respond with a pong within 60 seconds are disconnected. Standard WebSocket libraries handle this automatically.
- **Multiple messages per frame**: The write pump may batch queued messages newline-delimited in a single frame. Split on `\n` before parsing JSON.

## 🧪 Tests

Run the test suite to verify the scraper is working correctly:
```bash
cd api && go test -v -timeout 60s ./...
```

> **Note:** Tests scrape live Google Finance pages, so they require internet access. If Google changes their HTML structure, tests will fail — this is by design to detect breakages early.

## 🧿 Extras

Don't worry Google Finance allows itself to be scraped and I am not breaking any Terms of Service.

![Finance robots.txt](https://milindm.me/cdn/gfinance.png)

If you face any difficulties contact me [here.](https://milindm.me/contact/)

Thats it, have fun ✚✖
