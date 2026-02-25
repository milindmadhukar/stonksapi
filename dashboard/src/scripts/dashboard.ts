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
  if (ticker.startsWith("^")) return true;
  const colon = ticker.indexOf(":");
  if (colon === -1) return false;
  const exchange = ticker.slice(colon + 1).toUpperCase();
  return exchange.startsWith("INDEX");
}

function isCrypto(ticker: string): boolean {
  return ticker.includes("-") && !ticker.includes(":");
}

function detectKind(ticker: string): TrackedTicker["kind"] {
  if (isIndex(ticker)) return "index";
  if (isCrypto(ticker)) return "crypto";
  // fallback for any unrecognized strings without '-' or special prefixes
  return "stock";
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
let currentTab: "all" | "stocks" | "crypto" | "indices" = "all";

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

// Tabs & Theme
const tabAll = document.getElementById("tab-all")!;
const tabStocks = document.getElementById("tab-stocks")!;
const tabCrypto = document.getElementById("tab-crypto")!;
const tabIndices = document.getElementById("tab-indices")!;
const themeLight = document.getElementById("theme-light")!;
const themeDark = document.getElementById("theme-dark")!;
const themeSystem = document.getElementById("theme-system")!;

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

function escapeHtml(str: string | undefined | null): string {
  if (str == null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cssEscape(ticker: string): string {
  return ticker.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function toggleEmpty(): void {
  const filtered = getFilteredSortedTickers();
  const totalTracked = tickers.size + indices.size;
  if (totalTracked === 0) {
    emptyState.classList.remove("hidden");
    toolbarEl.classList.add("hidden");
  } else {
    emptyState.classList.add("hidden");
    toolbarEl.classList.remove("hidden");
  }
  if (totalTracked > 0 && filtered.length === 0) {
    cardsContainer.innerHTML = `<div class="col-span-full text-center py-12 text-sm text-muted">No tickers match the current filter or tab.</div>`;
    listBody.innerHTML = `<div class="px-4 py-12 text-center text-sm text-muted">No tickers match the current filter or tab.</div>`;
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

  // Collect exchanges only from tickers visible in the current tab
  if (currentTab === "all" || currentTab === "indices") {
    for (const t of indices.values()) exchanges.add(getTickerExchange(t));
  }
  if (currentTab === "all" || currentTab === "stocks") {
    for (const t of tickers.values()) {
      if ((t.kind === "stock" || t.kind === "unknown") && !isIndex(t.ticker)) {
        exchanges.add(getTickerExchange(t));
      }
    }
  }
  if (currentTab === "all" || currentTab === "crypto") {
    for (const t of tickers.values()) {
      if (t.kind === "crypto") exchanges.add(getTickerExchange(t));
    }
  }

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
  // Restore saved filter if the exchange still exists in the current tab context
  if (currentFilter === "ALL" || exchanges.includes(currentFilter)) {
    filterSelect.value = currentFilter;
  } else {
    filterSelect.value = "ALL";
    currentFilter = "ALL";
  }
}

function updateSortOptions(): void {
  const marketCapOpt = sortSelect.querySelector<HTMLOptionElement>('option[value="marketcap"]');
  const volumeOpt = sortSelect.querySelector<HTMLOptionElement>('option[value="volume"]');

  // Market Cap and Volume only apply to stocks
  const showStockSorts = currentTab === "all" || currentTab === "stocks";

  if (marketCapOpt) marketCapOpt.hidden = !showStockSorts;
  if (volumeOpt) volumeOpt.hidden = !showStockSorts;

  // If current sort is hidden, fall back to custom
  if (!showStockSorts && (currentSort === "marketcap" || currentSort === "volume")) {
    currentSort = "custom";
    sortSelect.value = "custom";
    savePrefs();
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
  let resultStocks: TrackedTicker[] = [];
  for (const key of tickerOrder) {
    const t = tickers.get(key);
    if (t) resultStocks.push(t);
  }
  for (const [key, t] of tickers) {
    if (!tickerOrder.includes(key)) {
      resultStocks.push(t);
      tickerOrder.push(key);
    }
  }

  let resultIndices: TrackedTicker[] = [];
  for (const key of indexOrder) {
    const t = indices.get(key);
    if (t) resultIndices.push(t);
  }
  for (const [key, t] of indices) {
    if (!indexOrder.includes(key)) {
      resultIndices.push(t);
      indexOrder.push(key);
    }
  }

  let combined: TrackedTicker[] = [];
  if (currentTab === "all") combined = [...resultIndices, ...resultStocks];
  else if (currentTab === "indices") combined = [...resultIndices, ...resultStocks.filter(t => t.kind === "index" || isIndex(t.ticker))];
  else if (currentTab === "stocks") combined = resultStocks.filter(t => (t.kind === "stock" || t.kind === "unknown") && !isIndex(t.ticker));
  else if (currentTab === "crypto") combined = resultStocks.filter(t => t.kind === "crypto");

  if (currentFilter !== "ALL") {
    combined = combined.filter((t) => getTickerExchange(t) === currentFilter);
  }

  if (currentSort !== "custom") {
    combined.sort((a, b) => {
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

  return combined;
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

// Deleted index-specific strip renderers (merged into main grid via renderCard)

// ---------- stock/crypto card rendering ----------
function renderCard(t: TrackedTicker): string {
  const { ticker, data, lastUpdated, direction, kind } = t;
  const id = cssEscape(ticker);
  const sym = getCurrencySymbol(ticker, data, kind);
  const kindBadge =
    kind === "crypto"
      ? `<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 uppercase tracking-wider">Crypto</span>`
      : (kind === "stock" || kind === "unknown")
        ? `<span class="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent uppercase tracking-wider">Stock</span>`
        : `<span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Index</span>`;

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
  if (kind === "crypto") {
    const c = data as CryptoData;
    detailsHtml = `
      <div class="mt-4 space-y-1.5 border-t border-border pt-4">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted">Prev Close</span>
          <span class="text-subtle font-medium tabular-nums">${formatPrice(c.previousClose, sym)}</span>
        </div>
      </div>`;
  } else if (kind === "index") {
    const idx = data as IndexData;
    const rows = [
      ["Prev Close", formatPrice(idx.previousClose, sym)],
      ["Day Range", escapeHtml(idx.dayRange)],
      ["Year Range", escapeHtml(idx.yearRange)],
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
    const s = data as StockData;
    const rows = [
      ["Prev Close", formatPrice(s.previousClose, sym)],
      ["Day Range", escapeHtml(s.dayRange)],
      ["Year Range", escapeHtml(s.yearRange)],
      ["Volume", escapeHtml(s.volume || "\u2014")],
      ["Market Cap", escapeHtml(s.marketCap || "\u2014")],
      ["P/E Ratio", `${s.peRatio || "\u2014"}`],
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

  const volume = (kind === "stock" || kind === "unknown") ? ((data as StockData).volume || "\u2014") : "\u2014";
  const marketCap = (kind === "stock" || kind === "unknown") ? ((data as StockData).marketCap || "\u2014") : "\u2014";

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
          </div>
        </div>
        <button class="card-remove self-center rounded-md p-1.5 text-muted/40 hover:text-down hover:bg-surface-3 transition-colors shrink-0 ml-1" data-ticker="${escapeHtml(ticker)}">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
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
  updateSortOptions();
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
  toggleEmpty();
}

// ---------- flash indicators ----------
function flashCard(ticker: string, dir: PriceDirection): void {
  const id = cssEscape(ticker);
  if (!dir || dir === "flat") return;

  const flashClass = dir === "down" ? "flash-down" : "flash-up";

  if (currentView === "card") {
    const card = document.getElementById(`card-${id}`);
    const dot = document.getElementById(`dot-${id}`);

    if (card) {
      card.classList.remove("flash-up", "flash-down");
      void card.offsetWidth; // trigger reflow
      card.classList.add(flashClass);
      setTimeout(() => card.classList.remove(flashClass), 1500);
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
    const listFlashClass = dir === "down" ? "list-flash-down" : "list-flash-up";

    if (row) {
      row.classList.remove("list-flash-up", "list-flash-down");
      void row.offsetWidth; // trigger reflow
      row.classList.add(listFlashClass);
      setTimeout(() => row.classList.remove("list-flash-up", "list-flash-down"), 1500);
    }
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

function handleDrop(fromTicker: string, toTicker: string): void {
  if (fromTicker === toTicker) return;

  // Since we merged indices and stocks, we need to correctly determine the source order tracking logic.
  let isIndex = false;
  let arrOrder = tickerOrder;
  if (indices.has(fromTicker)) {
    isIndex = true;
    arrOrder = indexOrder;
  }

  if (currentSort !== "custom") {
    // If user interacts via drag while not "custom", auto swap to custom but just update the visual order 
    // bounded by the type they dragged (so we don't mix up global custom orders weirdly if they filter).
    currentSort = "custom";
    sortSelect.value = "custom";
    savePrefs();
  }

  const fromIdx = arrOrder.indexOf(fromTicker);
  const toIdx = arrOrder.indexOf(toTicker);
  // Do not allow dragging across boundaries of index/stock for internal sorted arrays for now
  if (fromIdx === -1 || toIdx === -1) return;

  arrOrder.splice(fromIdx, 1);
  arrOrder.splice(toIdx, 0, fromTicker);

  if (isIndex) saveIndices();
  else saveTickers();

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
        renderAll();
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

          renderAll();
          requestAnimationFrame(() => flashCard(msg.ticker, dir));
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
  renderAll();

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
  renderAll();
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

// Tabs Event Listeners
const tabs = [
  { id: "all", el: tabAll },
  { id: "stocks", el: tabStocks },
  { id: "crypto", el: tabCrypto },
  { id: "indices", el: tabIndices }
];

tabs.forEach(tab => {
  tab.el.addEventListener("click", () => {
    currentTab = tab.id as any;
    // Reset filter when switching tabs since available exchanges change per tab
    currentFilter = "ALL";
    filterSelect.value = "ALL";
    savePrefs();
    tabs.forEach(t => {
      t.el.classList.remove("active", "border-accent", "text-foreground");
      t.el.classList.add("border-transparent", "text-muted");
    });
    tab.el.classList.add("active", "border-accent", "text-foreground");
    tab.el.classList.remove("border-transparent", "text-muted");
    renderAll();
  });
});

// Theme Logic
type ThemeMode = "light" | "dark" | "system";
let currentTheme: ThemeMode = (localStorage.getItem("stonks-theme") as ThemeMode) || "system";

function applyTheme(theme: ThemeMode) {
  currentTheme = theme;
  localStorage.setItem("stonks-theme", theme);

  themeLight.classList.remove("active", "text-foreground");
  themeDark.classList.remove("active", "text-foreground");
  themeSystem.classList.remove("active", "text-foreground");

  if (theme === "light") {
    document.documentElement.classList.remove("dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f4f4f5");
    themeLight.classList.add("active", "text-foreground");
  } else if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#09090b");
    themeDark.classList.add("active", "text-foreground");
  } else {
    themeSystem.classList.add("active", "text-foreground");
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#09090b");
    } else {
      document.documentElement.classList.remove("dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f4f4f5");
    }
  }
}

themeLight.addEventListener("click", () => applyTheme("light"));
themeDark.addEventListener("click", () => applyTheme("dark"));
themeSystem.addEventListener("click", () => applyTheme("system"));

window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', (e) => {
  if (currentTheme === "system") {
    applyTheme("system");
  }
});

applyTheme(currentTheme);

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
