package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly/v2"
	"github.com/gorilla/websocket"
)

// ---------------------------------------------------------------------------
// Message types exchanged over the WebSocket
// ---------------------------------------------------------------------------

// ClientMessage is what the client sends to subscribe/unsubscribe.
type ClientMessage struct {
	Action string `json:"action"` // "subscribe" or "unsubscribe"
	Ticker string `json:"ticker"` // e.g. "TSLA:NASDAQ" (stock) or "BTC-USD" (crypto)
}

// ServerMessage is what the server pushes to clients.
type ServerMessage struct {
	Type      string      `json:"type"`   // "stock_update", "crypto_update", "error", "subscribed", "unsubscribed"
	Ticker    string      `json:"ticker"` // the ticker key
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// ---------------------------------------------------------------------------
// StockEntry – a single tracked instrument in the in-memory store
// ---------------------------------------------------------------------------

// StockEntry wraps the latest scraped data for one ticker.
type StockEntry struct {
	Ticker      string            `json:"ticker"`
	IsStock     bool              `json:"isStock"` // true = stock, false = crypto
	StockData   *Stock_Key_Stats  `json:"stockData,omitempty"`
	CryptoData  *Crypto_Key_Stats `json:"cryptoData,omitempty"`
	LastUpdated time.Time         `json:"lastUpdated"`
}

// ---------------------------------------------------------------------------
// Hub – central coordinator for state, clients and polling
// ---------------------------------------------------------------------------

// Hub manages the in-memory store of stock/crypto data, connected WebSocket
// clients, and the background polling loop.
type Hub struct {
	mu sync.RWMutex

	// store maps ticker -> latest entry  (e.g. "TSLA:NASDAQ" or "BTC-USD")
	store map[string]*StockEntry

	// subscribers maps ticker -> set of clients interested in it
	subscribers map[string]map[*Client]struct{}

	// clients is the set of all connected clients
	clients map[*Client]struct{}

	// register / unregister channels
	registerCh   chan *Client
	unregisterCh chan *Client

	// collector used for scraping (cloned per-scrape)
	collector *colly.Collector

	// cfg holds all tunable parameters
	cfg *Config

	// sem is a semaphore that bounds the number of concurrent scrapes
	// during a poll cycle. Capacity = cfg.PollWorkers.
	sem chan struct{}

	// upgrader for WebSocket connections, configured from cfg
	upgrader websocket.Upgrader
}

// Client represents a single WebSocket connection.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte

	// tickers this client is subscribed to
	mu      sync.Mutex
	tickers map[string]struct{}
}

// ---------------------------------------------------------------------------
// Hub lifecycle
// ---------------------------------------------------------------------------

// NewHub creates and returns a new Hub.
func NewHub(collector *colly.Collector, cfg *Config) *Hub {
	return &Hub{
		store:        make(map[string]*StockEntry),
		subscribers:  make(map[string]map[*Client]struct{}),
		clients:      make(map[*Client]struct{}),
		registerCh:   make(chan *Client),
		unregisterCh: make(chan *Client),
		collector:    collector,
		cfg:          cfg,
		sem:          make(chan struct{}, cfg.PollWorkers),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  cfg.WSReadBufferSize,
			WriteBufferSize: cfg.WSWriteBufferSize,
			CheckOrigin: func(r *http.Request) bool {
				return true // allow all origins, matching existing CORS policy
			},
		},
	}
}

// Run starts the hub's main loop. Should be called in a goroutine.
func (h *Hub) Run() {
	pollTicker := time.NewTicker(h.cfg.PollInterval)
	defer pollTicker.Stop()

	log.Printf("[hub] started – poll every %s, %d workers", h.cfg.PollInterval, h.cfg.PollWorkers)

	for {
		select {
		case client := <-h.registerCh:
			h.mu.Lock()
			h.clients[client] = struct{}{}
			h.mu.Unlock()
			log.Printf("[hub] client connected (%d total)", len(h.clients))

		case client := <-h.unregisterCh:
			h.removeClient(client)
			log.Printf("[hub] client disconnected (%d total)", len(h.clients))

		case <-pollTicker.C:
			h.pollAll()
		}
	}
}

// removeClient unregisters a client from all subscriptions and closes it.
func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client]; !ok {
		return
	}

	client.mu.Lock()
	tickers := make([]string, 0, len(client.tickers))
	for t := range client.tickers {
		tickers = append(tickers, t)
	}
	client.mu.Unlock()

	for _, t := range tickers {
		if subs, ok := h.subscribers[t]; ok {
			delete(subs, client)
			// If no subscribers left, remove the ticker from polling entirely.
			if len(subs) == 0 {
				delete(h.subscribers, t)
				delete(h.store, t)
				log.Printf("[hub] ticker %s removed (no subscribers)", t)
			}
		}
	}

	delete(h.clients, client)
	close(client.send)
}

// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------

func (h *Hub) subscribe(client *Client, ticker string) {
	ticker = strings.TrimSpace(strings.ToUpper(ticker))
	if ticker == "" {
		return
	}

	h.mu.Lock()

	// Ensure subscriber set exists.
	if _, ok := h.subscribers[ticker]; !ok {
		h.subscribers[ticker] = make(map[*Client]struct{})
	}
	h.subscribers[ticker][client] = struct{}{}

	// Ensure store entry exists (will be populated on next poll).
	if _, ok := h.store[ticker]; !ok {
		h.store[ticker] = &StockEntry{
			Ticker:  ticker,
			IsStock: isStockTicker(ticker),
		}
		log.Printf("[hub] new ticker tracked: %s", ticker)
	}

	entry := h.store[ticker]
	h.mu.Unlock()

	client.mu.Lock()
	client.tickers[ticker] = struct{}{}
	client.mu.Unlock()

	// Acknowledge subscription.
	h.sendToClient(client, ServerMessage{
		Type:      "subscribed",
		Ticker:    ticker,
		Timestamp: time.Now(),
	})

	// If we already have data, send it immediately.
	if entry.StockData != nil || entry.CryptoData != nil {
		h.sendEntryToClient(client, entry)
	}

	// Do an immediate fetch for this ticker so the client doesn't wait for
	// the next poll cycle. Respects the semaphore.
	go func() {
		h.sem <- struct{}{} // acquire
		defer func() { <-h.sem }()
		h.pollTicker(ticker)
	}()
}

func (h *Hub) unsubscribe(client *Client, ticker string) {
	ticker = strings.TrimSpace(strings.ToUpper(ticker))
	if ticker == "" {
		return
	}

	h.mu.Lock()
	if subs, ok := h.subscribers[ticker]; ok {
		delete(subs, client)
		if len(subs) == 0 {
			delete(h.subscribers, ticker)
			delete(h.store, ticker)
			log.Printf("[hub] ticker %s removed (no subscribers)", ticker)
		}
	}
	h.mu.Unlock()

	client.mu.Lock()
	delete(client.tickers, ticker)
	client.mu.Unlock()

	h.sendToClient(client, ServerMessage{
		Type:      "unsubscribed",
		Ticker:    ticker,
		Timestamp: time.Now(),
	})
}

// isStockTicker distinguishes stocks (TSLA:NASDAQ) from crypto (BTC-USD).
// Stocks use ":" as separator, crypto uses "-".
func isStockTicker(ticker string) bool {
	return strings.Contains(ticker, ":")
}

// ---------------------------------------------------------------------------
// Polling / scraping  (worker-pool bounded)
// ---------------------------------------------------------------------------

// pollAll iterates all tracked tickers and refreshes data using a bounded
// worker pool. At most cfg.PollWorkers scrapes run concurrently.
func (h *Hub) pollAll() {
	h.mu.RLock()
	tickers := make([]string, 0, len(h.store))
	for t := range h.store {
		tickers = append(tickers, t)
	}
	h.mu.RUnlock()

	if len(tickers) == 0 {
		return
	}

	var wg sync.WaitGroup
	for _, t := range tickers {
		wg.Add(1)
		h.sem <- struct{}{} // acquire a slot (blocks if pool is full)
		go func(ticker string) {
			defer wg.Done()
			defer func() { <-h.sem }() // release
			h.pollTicker(ticker)
		}(t)
	}
	wg.Wait()
}

// pollTicker fetches fresh data for a single ticker, compares with stored
// data, and broadcasts to subscribers if anything changed.
func (h *Hub) pollTicker(ticker string) {
	// Create a fresh collector clone for each scrape to avoid callback
	// accumulation on the shared collector.
	c := h.collector.Clone()

	if isStockTicker(ticker) {
		newData := Get_Stock_Data(c, ticker)
		if newData.Name == "" {
			return // scrape failed or invalid ticker
		}

		h.mu.Lock()
		entry, ok := h.store[ticker]
		if !ok {
			h.mu.Unlock()
			return // ticker was removed while we were scraping
		}

		changed := entry.StockData == nil || *entry.StockData != *newData
		if changed {
			entry.StockData = newData
			entry.IsStock = true
			entry.LastUpdated = time.Now()
		}
		h.mu.Unlock()

		if changed {
			h.broadcastEntry(ticker, entry)
		}
	} else {
		parts := strings.SplitN(ticker, "-", 2)
		if len(parts) != 2 {
			return
		}
		newData := Get_Crypto_Data(c, parts[0], parts[1])
		if newData.Name == "" {
			return
		}

		h.mu.Lock()
		entry, ok := h.store[ticker]
		if !ok {
			h.mu.Unlock()
			return
		}

		changed := entry.CryptoData == nil || *entry.CryptoData != *newData
		if changed {
			entry.CryptoData = newData
			entry.IsStock = false
			entry.LastUpdated = time.Now()
		}
		h.mu.Unlock()

		if changed {
			h.broadcastEntry(ticker, entry)
		}
	}
}

// ---------------------------------------------------------------------------
// Broadcasting
// ---------------------------------------------------------------------------

func (h *Hub) broadcastEntry(ticker string, entry *StockEntry) {
	msgType := "stock_update"
	var data interface{} = entry.StockData
	if !entry.IsStock {
		msgType = "crypto_update"
		data = entry.CryptoData
	}

	msg := ServerMessage{
		Type:      msgType,
		Ticker:    ticker,
		Data:      data,
		Timestamp: entry.LastUpdated,
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[hub] marshal error: %v", err)
		return
	}

	h.mu.RLock()
	subs := h.subscribers[ticker]
	clients := make([]*Client, 0, len(subs))
	for c := range subs {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- payload:
		default:
			// Client buffer full – drop message rather than blocking the hub.
			log.Printf("[hub] dropping message for slow client")
		}
	}
}

func (h *Hub) sendEntryToClient(client *Client, entry *StockEntry) {
	msgType := "stock_update"
	var data interface{} = entry.StockData
	if !entry.IsStock {
		msgType = "crypto_update"
		data = entry.CryptoData
	}

	h.sendToClient(client, ServerMessage{
		Type:      msgType,
		Ticker:    entry.Ticker,
		Data:      data,
		Timestamp: entry.LastUpdated,
	})
}

func (h *Hub) sendToClient(client *Client, msg ServerMessage) {
	payload, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case client.send <- payload:
	default:
	}
}

// ---------------------------------------------------------------------------
// WebSocket HTTP handler
// ---------------------------------------------------------------------------

// ServeWs is the HTTP handler that upgrades to WebSocket.
func (h *Hub) ServeWs(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:     h,
		conn:    conn,
		send:    make(chan []byte, h.cfg.WSClientSendBuffer),
		tickers: make(map[string]struct{}),
	}

	h.registerCh <- client

	go client.writePump()
	go client.readPump()
}

// ---------------------------------------------------------------------------
// Client read / write pumps
// ---------------------------------------------------------------------------

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

func (c *Client) readPump() {
	defer func() {
		c.hub.unregisterCh <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[ws] read error: %v", err)
			}
			break
		}

		var msg ClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			c.hub.sendToClient(c, ServerMessage{
				Type:      "error",
				Error:     "invalid message format, expected JSON with 'action' and 'ticker' fields",
				Timestamp: time.Now(),
			})
			continue
		}

		switch msg.Action {
		case "subscribe":
			c.hub.subscribe(c, msg.Ticker)
		case "unsubscribe":
			c.hub.unsubscribe(c, msg.Ticker)
		default:
			c.hub.sendToClient(c, ServerMessage{
				Type:      "error",
				Error:     "unknown action: " + msg.Action + ". Use 'subscribe' or 'unsubscribe'",
				Timestamp: time.Now(),
			})
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Drain queued messages into the same write.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
