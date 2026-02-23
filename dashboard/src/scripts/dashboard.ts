// ---------- types ----------
interface StockData {
  stockName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayRange: string;
  yearRange: string;
  volume: string;
  marketCap: string;
  peRatio: number;
  primaryExchange: string;
}

interface IndexData {
  stockName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayRange: string;
  yearRange: string;
}

interface CryptoData {
  cryptoName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

interface ServerMessage {
  type:
    | "subscribed"
    | "unsubscribed"
    | "stock_update"
    | "index_update"
    | "crypto_update"
    | "error";
  ticker: string;
  data?: StockData | IndexData | CryptoData;
  error?: string;
  timestamp?: string;
}

type PriceDirection = "up" | "down" | "flat" | null;
type SortMode = "custom" | "winners" | "losers" | "marketcap" | "volume" | "updated";
type ViewMode = "card" | "list";

interface TrackedTicker {
  ticker: string;
  kind: "stock" | "crypto" | "index" | "unknown";
  data: StockData | IndexData | CryptoData | null;
  lastUpdated: Date | null;
  prevPrice: number | null;
  direction: PriceDirection;
}

// Storage keys — stocks/crypto
const STORAGE_KEY = "stonks-dashboard-tickers";
const ORDER_KEY = "stonks-dashboard-order";
const VIEW_KEY = "stonks-dashboard-view";
const SORT_KEY = "stonks-dashboard-sort";
const FILTER_KEY = "stonks-dashboard-filter";

// Storage keys — indices (separate)
const INDEX_STORAGE_KEY = "stonks-dashboard-indices";
const INDEX_ORDER_KEY = "stonks-dashboard-index-order";

// ---------- currency mapping ----------
const EXCHANGE_CURRENCY: Record<string, string> = {
  NASDAQ: "$", NYSE: "$", NYSEAMERICAN: "$", NYSEMKT: "$", NYSEARCA: "$", BATS: "$",
  TSX: "C$", TSXV: "C$", BMV: "MX$", BOVESPA: "R$", BCBA: "ARS ", BCS: "CLP ",
  NSE: "\u20B9", BSE: "\u20B9",
  LSE: "\u00A3", LON: "\u00A3",
  FRA: "\u20AC", ETR: "\u20AC", XETRA: "\u20AC", EPA: "\u20AC", AMS: "\u20AC",
  EBR: "\u20AC", BIT: "\u20AC", BME: "\u20AC", ELI: "\u20AC", HEL: "\u20AC", VIE: "\u20AC",
  IST: "\u20BA", STO: "kr ", CPH: "kr ", OSL: "kr ",
  WSE: "zł ", SWX: "CHF ",
  TYO: "\u00A5", JPX: "\u00A5", SHA: "CN\u00A5", SHE: "CN\u00A5",
  HKG: "HK$", HKEX: "HK$",
  KRX: "\u20A9", KOSDAQ: "\u20A9", KOSE: "\u20A9",
  TPE: "NT$", TWSE: "NT$", SGX: "S$", ASX: "A$", NZX: "NZ$",
  BKK: "\u0E3F", KLSE: "RM ", IDX: "Rp ", PSE: "\u20B1",
  TADAWUL: "SAR ", JSE: "R ", TASE: "\u20AA",
};

// Index exchange -> currency mapping
const INDEX_EXCHANGE_CURRENCY: Record<string, string> = {
  INDEXNSE: "\u20B9", INDEXBOM: "\u20B9",
  INDEXNASDAQ: "$", INDEXDJX: "$", INDEXSP: "$", INDEXNYSE: "$",
  INDEXLON: "\u00A3", INDEXFTSE: "\u00A3",
  INDEXTYO: "\u00A5", INDEXJPX: "\u00A5",
  INDEXHKG: "HK$", INDEXHKEX: "HK$",
  INDEXKRX: "\u20A9",
  INDEXASX: "A$",
  INDEXETR: "\u20AC", INDEXFRA: "\u20AC",
  INDEXSTO: "kr ", INDEXSWX: "CHF ",
};

const CRYPTO_CURRENCY: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", JPY: "\u00A5", INR: "\u20B9",
  CAD: "C$", AUD: "A$", BRL: "R$", KRW: "\u20A9", CNY: "CN\u00A5",
  CHF: "CHF ", HKD: "HK$", SGD: "S$", SEK: "kr ", NOK: "kr ",
  MXN: "MX$", TRY: "\u20BA", RUB: "\u20BD", ZAR: "R ", TWD: "NT$",
  PLN: "zł ", THB: "\u0E3F", IDR: "Rp ", PHP: "\u20B1",
  ILS: "\u20AA", SAR: "SAR ", NZD: "NZ$", ARS: "ARS ", CLP: "CLP ",
};

function getCurrencySymbol(ticker: string, data: StockData | IndexData | CryptoData | null, kind: TrackedTicker["kind"]): string {
  if (kind === "index") {
    const colon = ticker.indexOf(":");
    if (colon !== -1) {
      const exchange = ticker.slice(colon + 1).toUpperCase();
      if (INDEX_EXCHANGE_CURRENCY[exchange]) return INDEX_EXCHANGE_CURRENCY[exchange];
    }
    return "";
  }
  if (kind === "stock" && data && "primaryExchange" in data) {
    const exchange = (data as StockData).primaryExchange.toUpperCase();
    if (EXCHANGE_CURRENCY[exchange]) return EXCHANGE_CURRENCY[exchange];
  }
  if (kind === "crypto") {
    const dash = ticker.indexOf("-");
    if (dash !== -1) {
      const currency = ticker.slice(dash + 1).toUpperCase();
      if (CRYPTO_CURRENCY[currency]) return CRYPTO_CURRENCY[currency];
    }
  }
  const colon = ticker.indexOf(":");
  if (colon !== -1) {
    const exchange = ticker.slice(colon + 1).toUpperCase();
    if (EXCHANGE_CURRENCY[exchange]) return EXCHANGE_CURRENCY[exchange];
  }
  return "$";
}

// ---------- helpers ----------
function isIndex(ticker: string): boolean {
  const colon = ticker.indexOf(":");
  if (colon === -1) return false;
  const exchange = ticker.slice(colon + 1).toUpperCase();
  return exchange.startsWith("INDEX");
}

function isStock(ticker: string): boolean {
  return ticker.includes(":");
}

function isCrypto(ticker: string): boolean {
  return ticker.includes("-") && !ticker.includes(":");
}

function detectKind(ticker: string): TrackedTicker["kind"] {
  if (isIndex(ticker)) return "index";
  if (isCrypto(ticker)) return "crypto";
  if (isStock(ticker)) return "stock";
  return "unknown";
}

// ---------- state ----------
// Stocks + crypto
const tickers = new Map<string, TrackedTicker>();
let tickerOrder: string[] = [];

// Indices (separate)
const indices = new Map<string, TrackedTicker>();
let indexOrder: string[] = [];

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentView: ViewMode = "card";
let currentSort: SortMode = "custom";
let currentFilter = "ALL";

// Search state
let searchDebounce: ReturnType<typeof setTimeout> | null = null;
let searchResults: SearchResult[] = [];
let selectedSearchIdx = -1;
let searchAbort: AbortController | null = null;

// ---------- DOM refs ----------
const cardsContainer = document.getElementById("cards")!;
const listBody = document.getElementById("list-body")!;
const listViewEl = document.getElementById("list-view")!;
const statusEl = document.getElementById("status")!;
const emptyState = document.getElementById("empty-state")!;
const toolbarEl = document.getElementById("toolbar")!;
const tickerInput = document.getElementById("ticker-input") as HTMLInputElement;
const subscribeBtn = document.getElementById("subscribe-btn")!;
const filterSelect = document.getElementById("filter-exchange") as HTMLSelectElement;
const sortSelect = document.getElementById("sort-select") as HTMLSelectElement;
const viewCardBtn = document.getElementById("view-card")!;
const viewListBtn = document.getElementById("view-list")!;
const searchDropdown = document.getElementById("search-dropdown")!;
const indicesStrip = document.getElementById("indices-strip")!;
const indicesContainer = document.getElementById("indices-container")!;

// ---------- backend URL from meta tag ----------
const backendMeta = document.querySelector('meta[name="backend-url"]') as HTMLMetaElement | null;
const backendUrl = backendMeta?.content || "localhost:8084";

// ---------- localStorage ----------
function saveTickers(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(tickers.keys())));
    localStorage.setItem(ORDER_KEY, JSON.stringify(tickerOrder));
  } catch { /* storage full */ }
}

function saveIndices(): void {
  try {
    localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(Array.from(indices.keys())));
    localStorage.setItem(INDEX_ORDER_KEY, JSON.stringify(indexOrder));
  } catch { /* storage full */ }
}

function savePrefs(): void {
  try {
    localStorage.setItem(VIEW_KEY, currentView);
    localStorage.setItem(SORT_KEY, currentSort);
    localStorage.setItem(FILTER_KEY, currentFilter);
  } catch { /* ignore */ }
}

function loadTickers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((t) => typeof t === "string" && t.length > 0);
  } catch { /* corrupt */ }
  return [];
}

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* corrupt */ }
  return [];
}

function loadIndices(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((t) => typeof t === "string" && t.length > 0);
  } catch { /* corrupt */ }
  return [];
}

function loadIndexOrder(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* corrupt */ }
  return [];
}

function loadPrefs(): { view: ViewMode; sort: SortMode; filter: string } {
  const savedView = localStorage.getItem(VIEW_KEY) as ViewMode | null;
  // Default to list view on mobile if no saved preference
  const view: ViewMode = savedView
    ? savedView
    : window.innerWidth < 640
      ? "list"
      : "card";
  const sort = (localStorage.getItem(SORT_KEY) as SortMode) || "custom";
  const filter = localStorage.getItem(FILTER_KEY) || "ALL";
  return { view, sort, filter };
}

// ---------- helpers ----------
function setStatus(connected: boolean): void {
  const dotClass = connected ? "bg-up shadow-up" : "bg-down shadow-down";
  const label = connected ? "Connected" : "Disconnected";
  statusEl.innerHTML = `
    <span class="inline-block h-2 w-2 rounded-full shadow-[0_0_6px] ${dotClass}"></span>
    <span>${label}</span>`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cssEscape(ticker: string): string {
  return ticker.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function toggleEmpty(): void {
  const filtered = getFilteredSortedTickers();
  if (tickers.size === 0) {
    emptyState.classList.remove("hidden");
    toolbarEl.classList.add("hidden");
  } else {
    emptyState.classList.add("hidden");
    toolbarEl.classList.remove("hidden");
  }
  if (tickers.size > 0 && filtered.length === 0) {
    cardsContainer.innerHTML = `<div class="col-span-full text-center py-12 text-sm text-muted">No tickers match the current filter.</div>`;
    listBody.innerHTML = `<div class="px-4 py-12 text-center text-sm text-muted">No tickers match the current filter.</div>`;
  }
  // Hide indices container if empty, but keep the strip (with add input) always visible
  if (indices.size > 0) {
    indicesContainer.classList.remove("hidden");
  } else {
    indicesContainer.classList.add("hidden");
  }
}

function formatPrice(price: number, currencySymbol: string): string {
  return `${escapeHtml(currencySymbol)}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------- exchange / group helpers ----------
function getTickerExchange(t: TrackedTicker): string {
  if (t.kind === "crypto") return "Crypto";
  if (t.kind === "index") return "Index";
  if (t.data && "primaryExchange" in t.data) {
    return (t.data as StockData).primaryExchange.toUpperCase();
  }
  const colon = t.ticker.indexOf(":");
  if (colon !== -1) return t.ticker.slice(colon + 1).toUpperCase();
  return "Unknown";
}

function getActiveExchanges(): string[] {
  const exchanges = new Set<string>();
  for (const t of tickers.values()) exchanges.add(getTickerExchange(t));
  return Array.from(exchanges).sort();
}

function updateFilterOptions(): void {
  const exchanges = getActiveExchanges();
  filterSelect.innerHTML = `<option value="ALL">All</option>`;
  for (const ex of exchanges) {
    const opt = document.createElement("option");
    opt.value = ex;
    opt.textContent = ex;
    filterSelect.appendChild(opt);
  }
  // Restore saved filter if the exchange still exists
  if (currentFilter === "ALL" || exchanges.includes(currentFilter)) {
    filterSelect.value = currentFilter;
  } else {
    filterSelect.value = "ALL";
    currentFilter = "ALL";
  }
}

// ---------- sorting ----------
function parseVolume(vol: string): number {
  if (!vol) return 0;
  const cleaned = vol.replace(/[^0-9.KMBTkmbt]/g, "").trim();
  const match = cleaned.match(/^([0-9.]+)\s*([KMBTkmbt]?)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  return num * (multipliers[suffix] || 1);
}

function parseMarketCap(cap: string): number {
  if (!cap) return 0;
  return parseVolume(cap);
}

function getFilteredSortedTickers(): TrackedTicker[] {
  let result: TrackedTicker[] = [];
  for (const key of tickerOrder) {
    const t = tickers.get(key);
    if (t) result.push(t);
  }
  for (const [key, t] of tickers) {
    if (!tickerOrder.includes(key)) {
      result.push(t);
      tickerOrder.push(key);
    }
  }

  if (currentFilter !== "ALL") {
    result = result.filter((t) => getTickerExchange(t) === currentFilter);
  }

  if (currentSort !== "custom") {
    result.sort((a, b) => {
      switch (currentSort) {
        case "winners":
          return (b.data?.changePercent ?? -Infinity) - (a.data?.changePercent ?? -Infinity);
        case "losers":
          return (a.data?.changePercent ?? Infinity) - (b.data?.changePercent ?? Infinity);
        case "marketcap": {
          const aCap = a.data && "marketCap" in a.data ? parseMarketCap((a.data as StockData).marketCap) : 0;
          const bCap = b.data && "marketCap" in b.data ? parseMarketCap((b.data as StockData).marketCap) : 0;
          return bCap - aCap;
        }
        case "volume": {
          const aVol = a.data && "volume" in a.data ? parseVolume((a.data as StockData).volume) : 0;
          const bVol = b.data && "volume" in b.data ? parseVolume((b.data as StockData).volume) : 0;
          return bVol - aVol;
        }
        case "updated": {
          const aTime = a.lastUpdated?.getTime() ?? 0;
          const bTime = b.lastUpdated?.getTime() ?? 0;
          return bTime - aTime;
        }
        default:
          return 0;
      }
    });
  }

  return result;
}

function getOrderedIndices(): TrackedTicker[] {
  const result: TrackedTicker[] = [];
  for (const key of indexOrder) {
    const t = indices.get(key);
    if (t) result.push(t);
  }
  for (const [key, t] of indices) {
    if (!indexOrder.includes(key)) {
      result.push(t);
      indexOrder.push(key);
    }
  }
  return result;
}

// ---------- rendering ----------
function directionArrow(dir: PriceDirection): string {
  if (dir === "up") {
    return `<span class="price-tick-arrow text-up" style="animation: tick-arrow 1.2s ease-out forwards;">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
    </span>`;
  }
  if (dir === "down") {
    return `<span class="price-tick-arrow text-down" style="animation: tick-arrow-down 1.2s ease-out forwards;">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
    </span>`;
  }
  return "";
}

function directionArrowSmall(dir: PriceDirection): string {
  if (dir === "up") {
    return `<span class="text-up" style="animation: tick-arrow 1.2s ease-out forwards;">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
    </span>`;
  }
  if (dir === "down") {
    return `<span class="text-down" style="animation: tick-arrow-down 1.2s ease-out forwards;">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
    </span>`;
  }
  return "";
}

function directionArrowTiny(dir: PriceDirection): string {
  if (dir === "up") {
    return `<span class="text-up" style="animation: tick-arrow 1.2s ease-out forwards;">
      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
    </span>`;
  }
  if (dir === "down") {
    return `<span class="text-down" style="animation: tick-arrow-down 1.2s ease-out forwards;">
      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
    </span>`;
  }
  return "";
}

const dragHandleSvg = `<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.2"/><circle cx="11" cy="3" r="1.2"/><circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/><circle cx="5" cy="13" r="1.2"/><circle cx="11" cy="13" r="1.2"/></svg>`;

const dragHandleSvgSmall = `<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.2"/><circle cx="11" cy="3" r="1.2"/><circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/><circle cx="5" cy="13" r="1.2"/><circle cx="11" cy="13" r="1.2"/></svg>`;

// ---------- index card rendering ----------
function renderIndexCard(t: TrackedTicker): string {
  const { ticker, data, direction } = t;
  const id = cssEscape(ticker);
  const sym = getCurrencySymbol(ticker, data, "index");

  const dragHandle = `<span class="drag-handle cursor-grab active:cursor-grabbing text-muted/30 hover:text-muted/60 transition-colors">${dragHandleSvgSmall}</span>`;

  // Display name: use stockName or ticker part before colon
  const displayName = data && "stockName" in data ? (data as IndexData).stockName : ticker.split(":")[0].replace(/_/g, " ");

  if (!data) {
    return `
      <div class="index-card group relative flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 min-w-[160px] shrink-0 animate-fade-in" id="idx-${id}" draggable="true" data-ticker="${escapeHtml(ticker)}">
        ${dragHandle}
        <div class="flex flex-col min-w-0">
          <span class="text-xs font-semibold text-foreground truncate">${escapeHtml(displayName)}</span>
          <span class="flex items-center gap-1 text-[10px] text-muted">
            <span class="inline-block h-1 w-1 rounded-full bg-muted/40 animate-pulse-glow"></span>
            Loading...
          </span>
        </div>
        <button class="index-remove ml-auto rounded p-0.5 text-muted/30 opacity-0 group-hover:opacity-100 hover:text-down transition-all" data-ticker="${escapeHtml(ticker)}">
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>`;
  }

  const d = data as IndexData;
  const price = d.price;
  const change = d.change;
  const changePercent = d.changePercent;
  const isPositive = change >= 0;
  const sign = isPositive ? "+" : "";
  const changeColor = isPositive ? "text-up" : "text-down";
  const changeBg = isPositive ? "bg-up/10" : "bg-down/10";

  return `
    <div class="index-card group relative flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 min-w-[180px] shrink-0 transition-all duration-300 hover:border-border-hover hover:bg-surface-2 animate-fade-in" id="idx-${id}" draggable="true" data-ticker="${escapeHtml(ticker)}">
      ${dragHandle}
      <div class="flex flex-col min-w-0">
        <span class="text-[10px] text-muted truncate leading-tight">${escapeHtml(displayName)}</span>
        <div class="flex items-center gap-1.5">
          <span class="index-price text-sm font-bold tabular-nums text-foreground" id="iprice-${id}">${formatPrice(price, sym)}</span>
          ${directionArrowTiny(direction)}
        </div>
      </div>
      <div class="flex flex-col items-end ml-auto">
        <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${changeColor} ${changeBg}">${sign}${changePercent.toFixed(2)}%</span>
        <span class="text-[9px] tabular-nums ${changeColor} mt-0.5">${sign}${change.toFixed(2)}</span>
      </div>
      <button class="index-remove rounded p-0.5 text-muted/30 opacity-0 group-hover:opacity-100 hover:text-down transition-all shrink-0" data-ticker="${escapeHtml(ticker)}">
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>`;
}

function renderIndicesStrip(): void {
  const ordered = getOrderedIndices();
  indicesContainer.innerHTML = ordered.map(renderIndexCard).join("");
  attachIndexDragListeners();
  attachIndexRemoveListeners();
}

function attachIndexRemoveListeners(): void {
  document.querySelectorAll<HTMLButtonElement>(".index-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ticker = btn.dataset.ticker;
      if (ticker) unsubscribeIndex(ticker);
    });
  });
}

// ---------- index drag and drop ----------
let draggedIndexTicker: string | null = null;

function attachIndexDragListeners(): void {
  const cards = indicesContainer.querySelectorAll<HTMLElement>("[draggable=true]");

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e: DragEvent) => {
      draggedIndexTicker = card.dataset.ticker || null;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedIndexTicker || "");
      }
      requestAnimationFrame(() => card.classList.add("card-dragging"));
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("card-dragging");
      indicesContainer.querySelectorAll(".card-drag-over").forEach((el) => el.classList.remove("card-drag-over"));
      draggedIndexTicker = null;
    });

    card.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const target = card.dataset.ticker;
      if (target && target !== draggedIndexTicker) {
        card.classList.add("card-drag-over");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("card-drag-over");
    });

    card.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      card.classList.remove("card-drag-over");
      const fromTicker = draggedIndexTicker;
      const toTicker = card.dataset.ticker;
      if (fromTicker && toTicker && fromTicker !== toTicker) {
        const fromIdx = indexOrder.indexOf(fromTicker);
        const toIdx = indexOrder.indexOf(toTicker);
        if (fromIdx !== -1 && toIdx !== -1) {
          indexOrder.splice(fromIdx, 1);
          indexOrder.splice(toIdx, 0, fromTicker);
          saveIndices();
          renderIndicesStrip();
        }
      }
    });
  });
}

// ---------- stock/crypto card rendering ----------
function renderCard(t: TrackedTicker): string {
  const { ticker, data, lastUpdated, direction, kind } = t;
  const id = cssEscape(ticker);
  const sym = getCurrencySymbol(ticker, data, kind);
  const kindBadge =
    kind === "crypto"
      ? `<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 uppercase tracking-wider">Crypto</span>`
      : kind === "stock"
        ? `<span class="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent uppercase tracking-wider">Stock</span>`
        : "";

  const dragHandle = `<span class="drag-handle cursor-grab active:cursor-grabbing text-muted/30 hover:text-muted/60 transition-colors">${dragHandleSvg}</span>`;

  if (!data) {
    return `
      <div class="group relative rounded-xl border border-border bg-surface-1 p-5 animate-fade-in" id="card-${id}" draggable="true" data-ticker="${escapeHtml(ticker)}">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-2">
            ${dragHandle}
            <span class="text-base font-semibold text-foreground">${escapeHtml(ticker)}</span>
            ${kindBadge}
          </div>
          <button class="card-remove rounded-md p-1 text-muted/40 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-surface-3 hover:text-down" data-ticker="${escapeHtml(ticker)}">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="flex items-center gap-2 text-sm text-muted">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-muted/40 animate-pulse-glow"></span>
          Waiting for data...
        </div>
      </div>`;
  }

  const isStockData = "stockName" in data;
  const name = isStockData ? (data as StockData).stockName : (data as CryptoData).cryptoName;
  const price = data.price;
  const change = data.change;
  const changePercent = data.changePercent;
  const isPositive = change >= 0;
  const sign = isPositive ? "+" : "";

  const changeColorClasses = isPositive ? "text-up bg-up/10" : "text-down bg-down/10";
  const arrowSvg = isPositive
    ? `<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>`
    : `<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>`;

  let detailsHtml = "";
  if (isStockData) {
    const s = data as StockData;
    const rows = [
      ["Prev Close", formatPrice(s.previousClose, sym)],
      ["Day Range", escapeHtml(s.dayRange)],
      ["Year Range", escapeHtml(s.yearRange)],
      ["Volume", escapeHtml(s.volume)],
      ["Market Cap", escapeHtml(s.marketCap)],
      ["P/E Ratio", `${s.peRatio}`],
    ];
    detailsHtml = `
      <div class="mt-4 space-y-1.5 border-t border-border pt-4">
        ${rows.map(([label, val]) =>
          `<div class="flex items-center justify-between text-xs">
            <span class="text-muted">${label}</span>
            <span class="text-subtle font-medium tabular-nums">${val}</span>
          </div>`
        ).join("")}
      </div>`;
  } else {
    const c = data as CryptoData;
    detailsHtml = `
      <div class="mt-4 space-y-1.5 border-t border-border pt-4">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted">Prev Close</span>
          <span class="text-subtle font-medium tabular-nums">${formatPrice(c.previousClose, sym)}</span>
        </div>
      </div>`;
  }

  return `
    <div class="group relative rounded-xl border border-border bg-surface-1 p-5 transition-all duration-300 hover:border-border-hover hover:bg-surface-2 animate-fade-in" id="card-${id}" draggable="true" data-ticker="${escapeHtml(ticker)}">
      <div class="flex items-start justify-between mb-1">
        <div class="flex items-center gap-2">
          ${dragHandle}
          <span class="text-base font-semibold text-foreground">${escapeHtml(ticker)}</span>
          ${kindBadge}
        </div>
        <button class="card-remove rounded-md p-1 text-muted/40 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-surface-3 hover:text-down" data-ticker="${escapeHtml(ticker)}">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <p class="text-xs text-muted mb-4 truncate">${escapeHtml(name)}</p>

      <div class="flex items-center gap-2 mb-1">
        <span class="price-value text-3xl font-bold tabular-nums tracking-tight" id="price-${id}">${formatPrice(price, sym)}</span>
        ${directionArrow(direction)}
      </div>

      <div class="flex items-center gap-1.5 mt-1">
        <span class="inline-flex items-center gap-1 rounded-md ${changeColorClasses} px-2 py-0.5 text-xs font-semibold tabular-nums">
          ${arrowSvg}
          ${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)
        </span>
      </div>

      ${detailsHtml}

      <div class="mt-4 flex items-center gap-1.5 text-[10px] text-muted/50">
        <span class="update-dot inline-block h-1.5 w-1.5 rounded-full bg-border transition-all duration-300" id="dot-${id}"></span>
        <span>Updated ${lastUpdated ? formatTime(lastUpdated) : "\u2014"}</span>
      </div>
    </div>`;
}

function renderListRow(t: TrackedTicker): string {
  const { ticker, data, lastUpdated, direction, kind } = t;
  const id = cssEscape(ticker);
  const sym = getCurrencySymbol(ticker, data, kind);

  const dragHandle = `<span class="drag-handle cursor-grab active:cursor-grabbing text-muted/30 hover:text-muted/60 transition-colors">${dragHandleSvg}</span>`;

  if (!data) {
    return `
      <div class="list-row transition-colors hover:bg-surface-2" id="row-${id}" draggable="true" data-ticker="${escapeHtml(ticker)}">
        <!-- Mobile: two-line layout -->
        <div class="flex items-center gap-2 px-3 py-3 sm:hidden">
          ${dragHandle}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-foreground text-sm">${escapeHtml(ticker)}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 text-xs text-muted">
              <span class="inline-block h-1 w-1 rounded-full bg-muted/40 animate-pulse-glow"></span>
              Waiting for data...
            </div>
          </div>
          <button class="card-remove rounded-md p-1.5 text-muted/40 hover:text-down hover:bg-surface-3 transition-colors" data-ticker="${escapeHtml(ticker)}">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <!-- Desktop: grid layout -->
        <div class="list-grid hidden sm:grid items-center px-4 py-2.5 text-sm">
          <div class="flex items-center gap-2">
            ${dragHandle}
            <span class="font-semibold text-foreground">${escapeHtml(ticker)}</span>
          </div>
          <span class="text-xs text-muted">\u2014</span>
          <span class="text-right text-muted">\u2014</span>
          <span class="text-right text-muted">\u2014</span>
          <span class="text-right text-muted">\u2014</span>
          <span class="text-right text-xs text-muted hidden lg:block">\u2014</span>
          <span class="text-right text-xs text-muted hidden lg:block">\u2014</span>
          <span class="text-right text-xs text-muted hidden md:block">\u2014</span>
          <div class="flex justify-center">
            <button class="card-remove rounded-md p-1 text-muted/40 hover:text-down hover:bg-surface-3 transition-colors" data-ticker="${escapeHtml(ticker)}">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>`;
  }

  const isStockData = "stockName" in data;
  const name = isStockData ? (data as StockData).stockName : (data as CryptoData).cryptoName;
  const price = data.price;
  const change = data.change;
  const changePercent = data.changePercent;
  const isPositive = change >= 0;
  const sign = isPositive ? "+" : "";
  const changeColor = isPositive ? "text-up" : "text-down";
  const changeBg = isPositive ? "bg-up/10" : "bg-down/10";

  const volume = isStockData ? (data as StockData).volume : "\u2014";
  const marketCap = isStockData ? (data as StockData).marketCap : "\u2014";

  return `
    <div class="list-row transition-colors hover:bg-surface-2" id="row-${id}" draggable="true" data-ticker="${escapeHtml(ticker)}">
      <!-- Mobile: two-line layout -->
      <div class="flex items-start gap-2 px-3 py-2.5 sm:hidden">
        <div class="mt-1">${dragHandle}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-semibold text-foreground text-sm">${escapeHtml(ticker.split(":")[0])}</span>
              <span class="text-[10px] text-muted truncate max-w-[120px]">${escapeHtml(name)}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span class="font-semibold text-foreground text-sm tabular-nums" id="lprice-m-${id}">${formatPrice(price, sym)}</span>
              ${directionArrowSmall(direction)}
            </div>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${changeColor} ${changeBg}">${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)</span>
            <button class="card-remove rounded-md p-1 text-muted/40 hover:text-down hover:bg-surface-3 transition-colors" data-ticker="${escapeHtml(ticker)}">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>
      <!-- Desktop: grid layout -->
      <div class="list-grid hidden sm:grid items-center px-4 py-2.5 text-sm">
        <div class="flex items-center gap-2">
          ${dragHandle}
          <span class="font-semibold text-foreground">${escapeHtml(ticker)}</span>
          ${directionArrowSmall(direction)}
        </div>
        <span class="text-xs text-muted truncate">${escapeHtml(name)}</span>
        <span class="text-right font-semibold tabular-nums" id="lprice-${id}">${formatPrice(price, sym)}</span>
        <span class="text-right tabular-nums ${changeColor}">${sign}${change.toFixed(2)}</span>
        <span class="text-right tabular-nums ${changeColor}">${sign}${changePercent.toFixed(2)}%</span>
        <span class="text-right text-xs text-subtle tabular-nums hidden lg:block">${escapeHtml(volume)}</span>
        <span class="text-right text-xs text-subtle tabular-nums hidden lg:block">${escapeHtml(marketCap)}</span>
        <span class="text-right text-xs text-muted hidden md:block">${lastUpdated ? formatTime(lastUpdated) : "\u2014"}</span>
        <div class="flex justify-center">
          <button class="card-remove rounded-md p-1 text-muted/40 hover:text-down hover:bg-surface-3 transition-colors" data-ticker="${escapeHtml(ticker)}">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>`;
}

function renderAll(): void {
  updateFilterOptions();
  const ordered = getFilteredSortedTickers();

  if (currentView === "card") {
    cardsContainer.classList.remove("hidden");
    listViewEl.classList.add("hidden");
    cardsContainer.innerHTML = ordered.map(renderCard).join("");
    attachCardDragListeners();
  } else {
    cardsContainer.classList.add("hidden");
    listViewEl.classList.remove("hidden");
    listBody.innerHTML = ordered.map(renderListRow).join("");
    attachListDragListeners();
  }

  attachRemoveListeners();
  renderIndicesStrip();
  toggleEmpty();
}

// ---------- flash indicators ----------
function flashCard(ticker: string, dir: PriceDirection): void {
  const id = cssEscape(ticker);

  if (currentView === "card") {
    const card = document.getElementById(`card-${id}`);
    const dot = document.getElementById(`dot-${id}`);
    const priceEl = document.getElementById(`price-${id}`);

    if (card) {
      card.style.animation = "none";
      void card.offsetWidth;
      card.style.animation = dir === "down"
        ? "flash-border-down 0.6s ease-out"
        : "flash-border 0.6s ease-out";
    }

    if (priceEl && dir && dir !== "flat") {
      priceEl.style.animation = "none";
      void priceEl.offsetWidth;
      priceEl.style.animation = dir === "down"
        ? "price-flash-down 1s ease-out"
        : "price-flash-up 1s ease-out";
    }

    if (dot) {
      const dotColor = dir === "down" ? "bg-down" : "bg-up";
      const dotShadow = dir === "down" ? "shadow-down" : "shadow-up";
      dot.classList.add(dotColor, "shadow-[0_0_6px]", dotShadow);
      dot.classList.remove("bg-border");
      setTimeout(() => {
        dot.classList.remove(dotColor, "shadow-[0_0_6px]", dotShadow);
        dot.classList.add("bg-border");
      }, 1500);
    }
  } else {
    const row = document.getElementById(`row-${id}`);
    const priceEl = document.getElementById(`lprice-${id}`);
    const priceMobileEl = document.getElementById(`lprice-m-${id}`);

    if (row) {
      row.classList.remove("list-flash-up", "list-flash-down");
      void row.offsetWidth;
      row.classList.add(dir === "down" ? "list-flash-down" : "list-flash-up");
      setTimeout(() => row.classList.remove("list-flash-up", "list-flash-down"), 800);
    }

    // Flash both desktop and mobile price elements
    for (const el of [priceEl, priceMobileEl]) {
      if (el && dir && dir !== "flat") {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = dir === "down"
          ? "price-flash-down 1s ease-out"
          : "price-flash-up 1s ease-out";
      }
    }
  }
}

function flashIndexCard(ticker: string, dir: PriceDirection): void {
  const id = cssEscape(ticker);
  const card = document.getElementById(`idx-${id}`);
  const priceEl = document.getElementById(`iprice-${id}`);

  if (card) {
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = dir === "down"
      ? "flash-border-down 0.6s ease-out"
      : "flash-border 0.6s ease-out";
  }

  if (priceEl && dir && dir !== "flat") {
    priceEl.style.animation = "none";
    void priceEl.offsetWidth;
    priceEl.style.animation = dir === "down"
      ? "price-flash-down 1s ease-out"
      : "price-flash-up 1s ease-out";
  }
}

function attachRemoveListeners(): void {
  document.querySelectorAll<HTMLButtonElement>(".card-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ticker = btn.dataset.ticker;
      if (ticker) unsubscribe(ticker);
    });
  });
}

// ---------- view toggle ----------
function setView(mode: ViewMode): void {
  currentView = mode;
  if (mode === "card") {
    viewCardBtn.classList.add("active");
    viewListBtn.classList.remove("active");
  } else {
    viewListBtn.classList.add("active");
    viewCardBtn.classList.remove("active");
  }
  savePrefs();
  renderAll();
}

// ---------- drag and drop: shared logic ----------
function handleDrop(fromTicker: string, toTicker: string): void {
  if (fromTicker === toTicker) return;

  if (currentSort !== "custom") {
    const visualOrder = getFilteredSortedTickers().map((t) => t.ticker);
    const visibleSet = new Set(visualOrder);
    const hiddenItems = tickerOrder.filter((t) => !visibleSet.has(t));
    tickerOrder = [...visualOrder, ...hiddenItems];

    currentSort = "custom";
    sortSelect.value = "custom";
    savePrefs();
  }

  const fromIdx = tickerOrder.indexOf(fromTicker);
  const toIdx = tickerOrder.indexOf(toTicker);
  if (fromIdx === -1 || toIdx === -1) return;

  tickerOrder.splice(fromIdx, 1);
  tickerOrder.splice(toIdx, 0, fromTicker);

  saveTickers();
  renderAll();
}

// ---------- drag and drop: card view ----------
let draggedTicker: string | null = null;

function attachCardDragListeners(): void {
  const cards = cardsContainer.querySelectorAll<HTMLElement>("[draggable=true]");

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e: DragEvent) => {
      draggedTicker = card.dataset.ticker || null;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedTicker || "");
      }
      requestAnimationFrame(() => card.classList.add("card-dragging"));
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("card-dragging");
      cardsContainer.querySelectorAll(".card-drag-over").forEach((el) => el.classList.remove("card-drag-over"));
      draggedTicker = null;
    });

    card.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const target = card.dataset.ticker;
      if (target && target !== draggedTicker) {
        card.classList.add("card-drag-over");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("card-drag-over");
    });

    card.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      card.classList.remove("card-drag-over");
      const fromTicker = draggedTicker;
      const toTicker = card.dataset.ticker;
      if (fromTicker && toTicker) handleDrop(fromTicker, toTicker);
    });
  });
}

// ---------- drag and drop: list view ----------
let draggedListTicker: string | null = null;

function attachListDragListeners(): void {
  const rows = listBody.querySelectorAll<HTMLElement>("[draggable=true]");

  rows.forEach((row) => {
    row.addEventListener("dragstart", (e: DragEvent) => {
      draggedListTicker = row.dataset.ticker || null;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedListTicker || "");
      }
      requestAnimationFrame(() => row.classList.add("row-dragging"));
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("row-dragging");
      listBody.querySelectorAll(".row-drag-over").forEach((el) => el.classList.remove("row-drag-over"));
      draggedListTicker = null;
    });

    row.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const target = row.dataset.ticker;
      if (target && target !== draggedListTicker) {
        row.classList.add("row-drag-over");
      }
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("row-drag-over");
    });

    row.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      row.classList.remove("row-drag-over");
      const fromTicker = draggedListTicker;
      const toTicker = row.dataset.ticker;
      if (fromTicker && toTicker) handleDrop(fromTicker, toTicker);
    });
  });
}

// ---------- search ----------
// Detect if a search result is a crypto result.
// New server: exchange is a currency code (e.g. "USD", "EUR") present in CRYPTO_CURRENCY.
// Old server: exchange is "" and name matches "CoinName (TICKER / CURRENCY)" pattern.
function isSearchResultCrypto(r: SearchResult): boolean {
  if (r.exchange.toUpperCase().startsWith("INDEX")) return false;
  // New server: exchange is a known crypto currency
  if (r.exchange && CRYPTO_CURRENCY[r.exchange.toUpperCase()]) return true;
  // Old server: exchange is empty, name has the "(TICKER / CURRENCY)" pattern
  if (!r.exchange && /\(.+\s*\/\s*.+\)/.test(r.name)) return true;
  return false;
}

// Build the correct WS ticker identifier from a search result.
// Stocks/Indices use "TICKER:EXCHANGE", Crypto uses "TICKER-EXCHANGE".
function buildTickerFromSearchResult(r: SearchResult): string {
  if (isSearchResultCrypto(r)) {
    // Crypto: need dash separator for WS
    if (r.exchange) {
      return `${r.ticker}-${r.exchange}`.toUpperCase();
    }
    // Old server fallback: parse currency from name like "Bitcoin (BTC / USD)"
    const match = r.name.match(/\(\s*\w+\s*\/\s*(\w+)\s*\)/);
    if (match) {
      return `${r.ticker}-${match[1]}`.toUpperCase();
    }
    return r.ticker.toUpperCase();
  }
  // Stock or index: colon separator
  return `${r.ticker}:${r.exchange}`.toUpperCase();
}

async function searchStocks(query: string): Promise<void> {
  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  try {
    const httpProto = location.protocol === "https:" ? "https" : "http";
    const res = await fetch(`${httpProto}://${backendUrl}/stocks/search/${encodeURIComponent(query)}`, {
      signal: searchAbort.signal,
    });
    if (!res.ok) {
      searchResults = [];
      renderSearchDropdown();
      return;
    }
    const data: SearchResult[] = await res.json();
    searchResults = data;
    selectedSearchIdx = -1;
    renderSearchDropdown();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    searchResults = [];
    renderSearchDropdown();
  }
}

function renderSearchDropdown(): void {
  if (searchResults.length === 0) {
    searchDropdown.classList.add("hidden");
    searchDropdown.innerHTML = "";
    return;
  }

  searchDropdown.classList.remove("hidden");
  searchDropdown.innerHTML = searchResults.map((r, i) => {
    const tickerStr = buildTickerFromSearchResult(r);
    const isSubscribed = tickers.has(tickerStr) || indices.has(tickerStr);
    const activeClass = i === selectedSearchIdx ? "bg-surface-3" : "";
    const subscribedClass = isSubscribed ? "opacity-50" : "";
    const isIdx = r.exchange.toUpperCase().startsWith("INDEX");
    const isCryptoResult = isSearchResultCrypto(r);

    return `
      <div class="search-result flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-surface-3 transition-colors ${activeClass} ${subscribedClass}" data-ticker="${escapeHtml(tickerStr)}" data-idx="${i}">
        <div class="flex items-center gap-3 min-w-0">
          <span class="font-semibold text-foreground text-sm">${escapeHtml(r.ticker)}</span>
          <span class="text-xs text-muted truncate">${escapeHtml(r.name)}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 ml-2">
          ${isIdx ? `<span class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400 font-medium">IDX</span>` : ""}
          ${isCryptoResult ? `<span class="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400 font-medium">CRYPTO</span>` : ""}
          <span class="rounded-full bg-surface-2 border border-border px-2 py-0.5 text-[10px] text-subtle font-medium">${escapeHtml(r.exchange || "Crypto")}</span>
        </div>
      </div>`;
  }).join("");

  searchDropdown.querySelectorAll<HTMLElement>(".search-result").forEach((el) => {
    el.addEventListener("click", () => {
      const ticker = el.dataset.ticker;
      if (ticker) {
        if (isIndex(ticker)) {
          subscribeIndex(ticker);
        } else {
          subscribe(ticker);
        }
        tickerInput.value = "";
        hideSearch();
      }
    });
  });
}

function hideSearch(): void {
  searchResults = [];
  selectedSearchIdx = -1;
  searchDropdown.classList.add("hidden");
  searchDropdown.innerHTML = "";
}

function handleSearchInput(): void {
  const val = tickerInput.value.trim();
  if (val.length < 2) {
    hideSearch();
    return;
  }
  // If user typed a direct ticker format (SYMBOL:EXCHANGE or SYMBOL-CURRENCY), don't search
  if (val.includes(":") || val.includes("-")) {
    hideSearch();
    return;
  }
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => searchStocks(val), 250);
}

// ---------- websocket ----------
function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const wsProto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${wsProto}://${backendUrl}/ws`);

  ws.addEventListener("open", () => {
    setStatus(true);
    // Re-subscribe stocks/crypto
    for (const ticker of tickers.keys()) {
      ws!.send(JSON.stringify({ action: "subscribe", ticker }));
    }
    // Re-subscribe indices
    for (const ticker of indices.keys()) {
      ws!.send(JSON.stringify({ action: "subscribe", ticker }));
    }
  });

  ws.addEventListener("message", (event: MessageEvent) => {
    const parts = (event.data as string).split("\n");
    for (const part of parts) {
      if (!part.trim()) continue;
      try {
        const msg: ServerMessage = JSON.parse(part);
        handleMessage(msg);
      } catch { /* malformed */ }
    }
  });

  ws.addEventListener("close", () => {
    setStatus(false);
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    ws?.close();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

function handleMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case "subscribed":
      break;
    case "unsubscribed":
      // Could be stock/crypto or index
      if (indices.has(msg.ticker)) {
        indices.delete(msg.ticker);
        indexOrder = indexOrder.filter((t) => t !== msg.ticker);
        saveIndices();
        renderIndicesStrip();
        toggleEmpty();
      } else {
        tickers.delete(msg.ticker);
        tickerOrder = tickerOrder.filter((t) => t !== msg.ticker);
        saveTickers();
        renderAll();
      }
      break;
    case "index_update":
    case "stock_update":
    case "crypto_update": {
      // Index tickers may arrive as index_update OR stock_update depending
      // on server version. Route by checking the indices Map first, then
      // fall back to checking isIndex() on the ticker itself.
      const isIdx = indices.has(msg.ticker) || (isIndex(msg.ticker) && !tickers.has(msg.ticker));

      if (isIdx) {
        // Ensure it's in the indices Map (handle race / server sending stock_update for an index)
        let tracked = indices.get(msg.ticker);
        if (!tracked) {
          // Auto-migrate: server sent update for an index we track in tickers
          tracked = tickers.get(msg.ticker) ?? undefined;
          if (tracked) {
            tickers.delete(msg.ticker);
            tickerOrder = tickerOrder.filter((t) => t !== msg.ticker);
            saveTickers();
            indices.set(msg.ticker, tracked);
            if (!indexOrder.includes(msg.ticker)) indexOrder.push(msg.ticker);
            saveIndices();
          }
        }
        if (tracked && msg.data) {
          const newPrice = msg.data.price;
          let dir: PriceDirection = null;
          if (tracked.data !== null) {
            const oldPrice = tracked.data.price;
            if (newPrice > oldPrice) dir = "up";
            else if (newPrice < oldPrice) dir = "down";
            else dir = "flat";
          }

          tracked.prevPrice = tracked.data?.price ?? null;
          tracked.data = msg.data;
          tracked.lastUpdated = msg.timestamp ? new Date(msg.timestamp) : new Date();
          tracked.kind = "index";
          tracked.direction = dir;

          renderIndicesStrip();
          toggleEmpty();
          requestAnimationFrame(() => flashIndexCard(msg.ticker, dir));
        }
      } else {
        const tracked = tickers.get(msg.ticker);
        if (tracked && msg.data) {
          const newPrice = msg.data.price;
          let dir: PriceDirection = null;
          if (tracked.data !== null) {
            const oldPrice = tracked.data.price;
            if (newPrice > oldPrice) dir = "up";
            else if (newPrice < oldPrice) dir = "down";
            else dir = "flat";
          }

          tracked.prevPrice = tracked.data?.price ?? null;
          tracked.data = msg.data;
          tracked.lastUpdated = msg.timestamp ? new Date(msg.timestamp) : new Date();
          tracked.kind = msg.type === "crypto_update" ? "crypto" : "stock";
          tracked.direction = dir;

          renderAll();
          requestAnimationFrame(() => flashCard(msg.ticker, dir));
        }
      }
      break;
    }
    case "error":
      console.error("Server error:", msg.error);
      break;
  }
}

function subscribe(ticker: string): void {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) return;

  // Route indices to subscribeIndex
  if (isIndex(normalized)) {
    subscribeIndex(normalized);
    return;
  }

  if (tickers.has(normalized)) return;

  tickers.set(normalized, {
    ticker: normalized,
    kind: detectKind(normalized),
    data: null,
    lastUpdated: null,
    prevPrice: null,
    direction: null,
  });

  if (!tickerOrder.includes(normalized)) {
    tickerOrder.push(normalized);
  }

  saveTickers();
  renderAll();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "subscribe", ticker: normalized }));
  }
}

function unsubscribe(ticker: string): void {
  if (!tickers.has(ticker)) return;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "unsubscribe", ticker }));
  }

  tickers.delete(ticker);
  tickerOrder = tickerOrder.filter((t) => t !== ticker);
  saveTickers();
  renderAll();
}

function subscribeIndex(ticker: string): void {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) return;
  if (indices.has(normalized)) return;

  indices.set(normalized, {
    ticker: normalized,
    kind: "index",
    data: null,
    lastUpdated: null,
    prevPrice: null,
    direction: null,
  });

  if (!indexOrder.includes(normalized)) {
    indexOrder.push(normalized);
  }

  saveIndices();
  renderIndicesStrip();
  toggleEmpty();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "subscribe", ticker: normalized }));
  }
}

function unsubscribeIndex(ticker: string): void {
  if (!indices.has(ticker)) return;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "unsubscribe", ticker }));
  }

  indices.delete(ticker);
  indexOrder = indexOrder.filter((t) => t !== ticker);
  saveIndices();
  renderIndicesStrip();
  toggleEmpty();
}

// ---------- event listeners ----------
subscribeBtn.addEventListener("click", () => {
  subscribe(tickerInput.value);
  tickerInput.value = "";
  tickerInput.focus();
  hideSearch();
});

tickerInput.addEventListener("input", handleSearchInput);

tickerInput.addEventListener("keydown", (e: KeyboardEvent) => {
  if (searchResults.length > 0) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedSearchIdx = Math.min(selectedSearchIdx + 1, searchResults.length - 1);
      renderSearchDropdown();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedSearchIdx = Math.max(selectedSearchIdx - 1, -1);
      renderSearchDropdown();
      return;
    }
    if (e.key === "Enter" && selectedSearchIdx >= 0) {
      e.preventDefault();
      const r = searchResults[selectedSearchIdx];
      if (r) {
        const tickerStr = buildTickerFromSearchResult(r);
        if (isIndex(tickerStr)) {
          subscribeIndex(tickerStr);
        } else {
          subscribe(tickerStr);
        }
        tickerInput.value = "";
        hideSearch();
      }
      return;
    }
    if (e.key === "Escape") {
      hideSearch();
      return;
    }
  }

  if (e.key === "Enter") {
    subscribe(tickerInput.value);
    tickerInput.value = "";
    hideSearch();
  }
});

// Close search dropdown when clicking outside
document.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as Node;
  if (!tickerInput.contains(target) && !searchDropdown.contains(target)) {
    hideSearch();
  }
});

filterSelect.addEventListener("change", () => {
  currentFilter = filterSelect.value;
  savePrefs();
  renderAll();
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value as SortMode;
  savePrefs();
  renderAll();
});

viewCardBtn.addEventListener("click", () => setView("card"));
viewListBtn.addEventListener("click", () => setView("list"));

// ---------- init ----------
const saved = loadTickers();
const savedOrder = loadOrder();
const savedIndices = loadIndices();
const savedIndexOrder = loadIndexOrder();
const prefs = loadPrefs();

tickerOrder = savedOrder.length > 0 ? savedOrder : [...saved];
indexOrder = savedIndexOrder.length > 0 ? savedIndexOrder : [...savedIndices];
currentView = prefs.view;
currentSort = prefs.sort;
currentFilter = prefs.filter;

sortSelect.value = currentSort;
filterSelect.value = currentFilter;
setView(currentView);

for (const ticker of saved) {
  tickers.set(ticker, {
    ticker,
    kind: detectKind(ticker),
    data: null,
    lastUpdated: null,
    prevPrice: null,
    direction: null,
  });
  if (!tickerOrder.includes(ticker)) {
    tickerOrder.push(ticker);
  }
}

for (const ticker of savedIndices) {
  indices.set(ticker, {
    ticker,
    kind: "index",
    data: null,
    lastUpdated: null,
    prevPrice: null,
    direction: null,
  });
  if (!indexOrder.includes(ticker)) {
    indexOrder.push(ticker);
  }
}

tickerOrder = tickerOrder.filter((t) => tickers.has(t));
indexOrder = indexOrder.filter((t) => indices.has(t));

renderAll();
connect();

// ---------- service worker registration ----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // SW registration failed — not critical
  });
}
