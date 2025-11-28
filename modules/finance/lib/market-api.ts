/**
 * Market API Integration
 *
 * Integração com APIs de mercado para cotações em tempo real
 * - Brapi: Ações e FIIs brasileiros (B3)
 * - CoinGecko: Criptomoedas
 */

import type { AssetType, MarketQuote } from "../types";

// ==========================================
// CACHE
// ==========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const quoteCache = new Map<string, CacheEntry<MarketQuote>>();
const CACHE_TTL = 30000; // 30 seconds

function getCachedQuote(symbol: string): MarketQuote | null {
  const entry = quoteCache.get(symbol);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  quoteCache.delete(symbol);
  return null;
}

function setCachedQuote(symbol: string, quote: MarketQuote): void {
  quoteCache.set(symbol, {
    data: quote,
    timestamp: Date.now(),
  });
}

// ==========================================
// BRAPI - Brazilian Stocks & FIIs
// ==========================================

interface BrapiQuoteResponse {
  results: Array<{
    symbol: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    regularMarketPreviousClose?: number;
    regularMarketTime?: string;
  }>;
  requestedAt?: string;
  error?: boolean;
  message?: string;
}

/**
 * Fetch quote from Brapi (free tier)
 * Supports: Brazilian stocks (PETR4, VALE3, etc.) and FIIs (HGLG11, MXRF11, etc.)
 */
export async function getBrapiQuote(
  symbol: string
): Promise<MarketQuote | null> {
  // Check cache first
  const cached = getCachedQuote(symbol);
  if (cached) return cached;

  try {
    const response = await fetch(`https://brapi.dev/api/quote/${symbol}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 }, // Next.js cache
    });

    if (!response.ok) {
      console.error(`Brapi error for ${symbol}: ${response.status}`);
      return null;
    }

    const data: BrapiQuoteResponse = await response.json();

    if (data.error || !data.results || data.results.length === 0) {
      console.error(`Brapi no results for ${symbol}:`, data.message);
      return null;
    }

    const result = data.results[0];
    const quote: MarketQuote = {
      symbol: result.symbol,
      price: result.regularMarketPrice,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      high: result.regularMarketDayHigh,
      low: result.regularMarketDayLow,
      volume: result.regularMarketVolume,
      previousClose: result.regularMarketPreviousClose,
      updatedAt: result.regularMarketTime || new Date().toISOString(),
    };

    setCachedQuote(symbol, quote);
    return quote;
  } catch (error) {
    console.error(`Error fetching Brapi quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple quotes from Brapi
 */
export async function getBrapiQuotes(
  symbols: string[]
): Promise<Map<string, MarketQuote>> {
  const results = new Map<string, MarketQuote>();
  const uncachedSymbols: string[] = [];

  // Check cache for each symbol
  for (const symbol of symbols) {
    const cached = getCachedQuote(symbol);
    if (cached) {
      results.set(symbol, cached);
    } else {
      uncachedSymbols.push(symbol);
    }
  }

  if (uncachedSymbols.length === 0) {
    return results;
  }

  try {
    const symbolList = uncachedSymbols.join(",");
    const response = await fetch(`https://brapi.dev/api/quote/${symbolList}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`Brapi batch error: ${response.status}`);
      return results;
    }

    const data: BrapiQuoteResponse = await response.json();

    if (!data.error && data.results) {
      for (const result of data.results) {
        const quote: MarketQuote = {
          symbol: result.symbol,
          price: result.regularMarketPrice,
          change: result.regularMarketChange,
          changePercent: result.regularMarketChangePercent,
          high: result.regularMarketDayHigh,
          low: result.regularMarketDayLow,
          volume: result.regularMarketVolume,
          previousClose: result.regularMarketPreviousClose,
          updatedAt: result.regularMarketTime || new Date().toISOString(),
        };
        setCachedQuote(result.symbol, quote);
        results.set(result.symbol, quote);
      }
    }
  } catch (error) {
    console.error("Error fetching Brapi batch quotes:", error);
  }

  return results;
}

// ==========================================
// COINGECKO - Cryptocurrencies
// ==========================================

interface CoinGeckoPrice {
  [coinId: string]: {
    brl: number;
    brl_24h_change?: number;
    brl_24h_vol?: number;
  };
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  last_updated: string;
}

// Map of common crypto symbols to CoinGecko IDs
const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BNB: "binancecoin",
  USDT: "tether",
  USDC: "usd-coin",
};

/**
 * Get CoinGecko ID from symbol
 */
function getCoinGeckoId(symbol: string): string {
  const upperSymbol = symbol
    .toUpperCase()
    .replace("USD", "")
    .replace("BRL", "");
  return CRYPTO_ID_MAP[upperSymbol] || symbol.toLowerCase();
}

/**
 * Fetch quote from CoinGecko (free tier)
 */
export async function getCoinGeckoQuote(
  symbol: string
): Promise<MarketQuote | null> {
  // Check cache first
  const cached = getCachedQuote(symbol);
  if (cached) return cached;

  try {
    const coinId = getCoinGeckoId(symbol);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=${coinId}&sparkline=false`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko error for ${symbol}: ${response.status}`);
      return null;
    }

    const data: CoinGeckoMarketData[] = await response.json();

    if (!data || data.length === 0) {
      console.error(`CoinGecko no results for ${symbol}`);
      return null;
    }

    const result = data[0];
    const quote: MarketQuote = {
      symbol: symbol.toUpperCase(),
      price: result.current_price,
      change: result.price_change_24h,
      changePercent: result.price_change_percentage_24h,
      high: result.high_24h,
      low: result.low_24h,
      volume: result.total_volume,
      updatedAt: result.last_updated,
    };

    setCachedQuote(symbol, quote);
    return quote;
  } catch (error) {
    console.error(`Error fetching CoinGecko quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple quotes from CoinGecko
 */
export async function getCoinGeckoQuotes(
  symbols: string[]
): Promise<Map<string, MarketQuote>> {
  const results = new Map<string, MarketQuote>();
  const uncachedSymbols: string[] = [];

  // Check cache for each symbol
  for (const symbol of symbols) {
    const cached = getCachedQuote(symbol);
    if (cached) {
      results.set(symbol, cached);
    } else {
      uncachedSymbols.push(symbol);
    }
  }

  if (uncachedSymbols.length === 0) {
    return results;
  }

  try {
    const coinIds = uncachedSymbols.map(getCoinGeckoId).join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=${coinIds}&sparkline=false`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko batch error: ${response.status}`);
      return results;
    }

    const data: CoinGeckoMarketData[] = await response.json();

    for (const result of data) {
      // Find original symbol
      const originalSymbol = uncachedSymbols.find(
        (s) => getCoinGeckoId(s) === result.id
      );
      if (!originalSymbol) continue;

      const quote: MarketQuote = {
        symbol: originalSymbol.toUpperCase(),
        price: result.current_price,
        change: result.price_change_24h,
        changePercent: result.price_change_percentage_24h,
        high: result.high_24h,
        low: result.low_24h,
        volume: result.total_volume,
        updatedAt: result.last_updated,
      };

      setCachedQuote(originalSymbol, quote);
      results.set(originalSymbol, quote);
    }
  } catch (error) {
    console.error("Error fetching CoinGecko batch quotes:", error);
  }

  return results;
}

// ==========================================
// UNIFIED API
// ==========================================

/**
 * Determine asset type from symbol
 */
export function detectAssetType(symbol: string): AssetType {
  const upperSymbol = symbol.toUpperCase();

  // Brazilian FIIs typically end with 11
  if (/^\w{4}11$/.test(upperSymbol)) {
    return "FII";
  }

  // Brazilian stocks typically have 3-4 and end with 3, 4, 5, 6, or F
  if (/^\w{4}[3456F]$/.test(upperSymbol)) {
    return "STOCK";
  }

  // Known crypto symbols
  if (CRYPTO_ID_MAP[upperSymbol.replace("USD", "").replace("BRL", "")]) {
    return "CRYPTO";
  }

  // Default to stock
  return "STOCK";
}

/**
 * Fetch quote using the appropriate API based on asset type
 */
export async function getQuote(
  symbol: string,
  assetType?: AssetType
): Promise<MarketQuote | null> {
  const type = assetType || detectAssetType(symbol);

  if (type === "CRYPTO") {
    return getCoinGeckoQuote(symbol);
  }

  // For Brazilian stocks, FIIs, and ETFs, use Brapi
  return getBrapiQuote(symbol);
}

/**
 * Fetch multiple quotes, grouping by asset type for efficiency
 */
export async function getQuotes(
  assets: Array<{ symbol: string; type?: AssetType }>
): Promise<Map<string, MarketQuote>> {
  const results = new Map<string, MarketQuote>();

  const brazilianSymbols: string[] = [];
  const cryptoSymbols: string[] = [];

  // Group by type
  for (const asset of assets) {
    const type = asset.type || detectAssetType(asset.symbol);
    if (type === "CRYPTO") {
      cryptoSymbols.push(asset.symbol);
    } else {
      brazilianSymbols.push(asset.symbol);
    }
  }

  // Fetch in parallel
  const [brapiResults, coinGeckoResults] = await Promise.all([
    brazilianSymbols.length > 0 ? getBrapiQuotes(brazilianSymbols) : new Map(),
    cryptoSymbols.length > 0 ? getCoinGeckoQuotes(cryptoSymbols) : new Map(),
  ]);

  // Merge results
  for (const [symbol, quote] of brapiResults) {
    results.set(symbol, quote);
  }
  for (const [symbol, quote] of coinGeckoResults) {
    results.set(symbol, quote);
  }

  return results;
}

// ==========================================
// CALCULATIONS
// ==========================================

/**
 * Calculate profit/loss for an investment
 */
export function calculateProfitLoss(
  quantity: number,
  averagePrice: number,
  currentPrice: number
): { value: number; percent: number } {
  const invested = quantity * averagePrice;
  const current = quantity * currentPrice;
  const value = current - invested;
  const percent = invested > 0 ? (value / invested) * 100 : 0;
  return { value, percent };
}

/**
 * Calculate new average price after a buy
 */
export function calculateAveragePrice(
  currentQty: number,
  currentAvgPrice: number,
  newQty: number,
  newPrice: number
): number {
  if (currentQty + newQty === 0) return 0;
  const totalValue = currentQty * currentAvgPrice + newQty * newPrice;
  const totalQty = currentQty + newQty;
  return totalValue / totalQty;
}

/**
 * Clear the quote cache
 */
export function clearQuoteCache(): void {
  quoteCache.clear();
}
