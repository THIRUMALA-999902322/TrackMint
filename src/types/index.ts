// ─────────────────────────────────────────────────────────────────────────────
// TrackMint - Shared TypeScript Types
// Frontend-facing interfaces that mirror the Prisma schema and define API
// response shapes, dashboard summaries, price data, and search results.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export enum AssetCategory {
  STOCK = "STOCK",
  CRYPTO = "CRYPTO",
  METAL = "METAL",
}

export enum AlertConditionType {
  ABOVE = "ABOVE",
  BELOW = "BELOW",
}

export enum NewsSentiment {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
  NEUTRAL = "NEUTRAL",
}

export enum EmailStatus {
  QUEUED = "QUEUED",
  SENT = "SENT",
  FAILED = "FAILED",
  BOUNCED = "BOUNCED",
}

// ── Entity Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  base_currency: string;
  digest_time: string;
  digest_enabled: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  exchange: string | null;
  source_provider: string;
  logo_url: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  items?: WatchlistItem[];
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  asset_id: string;
  created_at: string;
  asset?: Asset;
}

export interface Holding {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  avg_buy_price: number;
  fees: number;
  buy_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  pnl_amount: number;
  strategy_tag: string | null;
  notes: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  asset_id: string;
  condition_type: AlertConditionType;
  target_price: number;
  is_active: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
  asset?: Asset;
}

export interface PriceCache {
  id: string;
  asset_id: string;
  price: number;
  currency: string;
  source_provider: string;
  fetched_at: string;
  asset?: Asset;
}

export interface NewsItem {
  id: string;
  asset_id: string;
  headline: string;
  url: string;
  source_name: string;
  sentiment: NewsSentiment | null;
  published_at: string;
  created_at: string;
  asset?: Asset;
}

export interface EmailLog {
  id: string;
  user_id: string;
  email_type: string;
  subject: string;
  status: string;
  sent_at: string;
}

// ── API Response Types ───────────────────────────────────────────────────────

/**
 * Standard API envelope for single-resource responses.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

/**
 * Paginated list envelope returned by collection endpoints.
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  error?: string;
}

// ── Dashboard Summary Types ──────────────────────────────────────────────────

/**
 * Top-level dashboard payload combining portfolio value, daily change,
 * allocations, and recent performance data.
 */
export interface DashboardSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  daily_change: number;
  daily_change_pct: number;
  currency: string;
  allocations: PortfolioAllocation[];
  performance: PerformanceData[];
  top_gainers: HoldingPerformance[];
  top_losers: HoldingPerformance[];
  last_updated: string;
}

/**
 * A single slice of portfolio allocation (for pie/donut charts).
 */
export interface PortfolioAllocation {
  asset_id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  value: number;
  percentage: number;
  color: string;
}

/**
 * A single point on the portfolio performance time-series (for line/area charts).
 */
export interface PerformanceData {
  date: string;
  value: number;
  pnl: number;
  pnl_pct: number;
}

/**
 * Individual holding performance breakdown shown in gain/loss rankings.
 */
export interface HoldingPerformance {
  asset_id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  pnl: number;
  pnl_pct: number;
}

// ── Price Data Types ─────────────────────────────────────────────────────────

/**
 * Real-time or delayed price snapshot for a single asset.
 */
export interface PriceData {
  asset_id: string;
  symbol: string;
  price: number;
  currency: string;
  change_24h: number;
  change_24h_pct: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  market_cap: number | null;
  source_provider: string;
  fetched_at: string;
}

/**
 * Open-High-Low-Close-Volume candlestick bar for charting.
 */
export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Chart data response bundling OHLCV bars with metadata.
 */
export interface ChartData {
  asset_id: string;
  symbol: string;
  interval: string;
  bars: OHLCV[];
  currency: string;
  source_provider: string;
}

// ── News Types ───────────────────────────────────────────────────────────────

/**
 * Extended news item with optional sentiment score for feed rendering.
 */
export interface NewsFeedItem {
  id: string;
  asset_id: string;
  symbol: string;
  headline: string;
  url: string;
  source_name: string;
  sentiment: NewsSentiment | null;
  sentiment_score: number | null;
  published_at: string;
}

/**
 * Aggregated news summary for a given asset or watchlist.
 */
export interface NewsSummary {
  asset_id: string;
  symbol: string;
  total_articles: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  latest_headline: string | null;
  latest_published_at: string | null;
}

// ── Alert Types ──────────────────────────────────────────────────────────────

/**
 * Alert creation/update payload sent from the client.
 */
export interface AlertInput {
  asset_id: string;
  condition_type: AlertConditionType;
  target_price: number;
  cooldown_minutes?: number;
}

/**
 * Alert enriched with current price and distance for UI rendering.
 */
export interface AlertWithStatus extends Alert {
  current_price: number;
  distance: number;
  distance_pct: number;
}

// ── Journal Types ────────────────────────────────────────────────────────────

/**
 * Aggregate journal statistics displayed on the journal dashboard.
 */
export interface JournalSummary {
  total_entries: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
  net_pnl: number;
  streak: number;
  best_day: JournalDaySnapshot | null;
  worst_day: JournalDaySnapshot | null;
  by_strategy: StrategyBreakdown[];
}

/**
 * Snapshot of a single journal day for best/worst day comparisons.
 */
export interface JournalDaySnapshot {
  date: string;
  pnl_amount: number;
  strategy_tag: string | null;
  notes: string | null;
}

/**
 * PnL breakdown by strategy tag for journal analytics.
 */
export interface StrategyBreakdown {
  strategy_tag: string;
  count: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  avg_pnl: number;
}

/**
 * Input payload for creating or updating a journal entry.
 */
export interface JournalEntryInput {
  entry_date: string;
  pnl_amount: number;
  strategy_tag?: string;
  notes?: string;
}

// ── Search Types ─────────────────────────────────────────────────────────────

/**
 * A single search result returned by the asset search endpoint.
 */
export interface SearchResult {
  asset_id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  exchange: string | null;
  logo_url: string | null;
  is_in_watchlist: boolean;
}

/**
 * Response from the asset search API.
 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

// ── User Settings Types ──────────────────────────────────────────────────────

/**
 * User-editable profile and preference fields.
 */
export interface UserSettings {
  name: string | null;
  timezone: string;
  base_currency: string;
  digest_time: string;
  digest_enabled: boolean;
}

/**
 * Payload to update a subset of user settings (all fields optional).
 */
export interface UserSettingsInput {
  name?: string;
  timezone?: string;
  base_currency?: string;
  digest_time?: string;
  digest_enabled?: boolean;
}

/**
 * Supported currency option for the currency picker.
 */
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Supported timezone option for the timezone picker.
 */
export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

// ── Holding Input Types ──────────────────────────────────────────────────────

/**
 * Payload for adding or editing a holding.
 */
export interface HoldingInput {
  asset_id: string;
  quantity: number;
  avg_buy_price: number;
  fees?: number;
  buy_date: string;
  notes?: string;
}

// ── Watchlist Input Types ────────────────────────────────────────────────────

/**
 * Payload for creating a new watchlist.
 */
export interface WatchlistInput {
  name: string;
}

/**
 * Payload for adding an asset to a watchlist.
 */
export interface WatchlistItemInput {
  asset_id: string;
}
