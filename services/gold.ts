import type { GoldPrice, HistoricalPrice } from "@/types";

const YAHOO_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const TICKER = "GC%3DF"; // GC=F — Gold futures (XAU/USD spot proxy)
const HEADERS = { "User-Agent": "Mozilla/5.0" };

interface YahooMeta {
  regularMarketPrice: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketTime?: number;
}

interface YahooQuote {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
}

interface YahooResult {
  meta: YahooMeta;
  timestamp: number[];
  indicators: { quote: YahooQuote[] };
}

async function fetchYahoo(
  interval: string,
  range: string
): Promise<YahooResult | null> {
  try {
    const url = `${YAHOO_BASE}/${TICKER}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchGoldPrice(): Promise<GoldPrice> {
  const result = await fetchYahoo("1d", "2d");

  if (result) {
    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = Math.round((price - prevClose) * 100) / 100;
    const changePercent = Math.round((change / prevClose) * 10000) / 100;

    return {
      price: Math.round(price * 100) / 100,
      change,
      changePercent,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
      timestamp: (meta.regularMarketTime ?? Date.now() / 1000) * 1000,
      trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
    };
  }

  return buildSimulatedPrice(3300);
}

export async function fetchHistoricalPrices(): Promise<HistoricalPrice[]> {
  // ~200 hourly candles = ~8–9 days
  const result = await fetchYahoo("1h", "9d");

  if (result) {
    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];
    const candles: HistoricalPrice[] = [];

    for (let i = 0; i < timestamp.length; i++) {
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];

      // Skip candles with missing data (market closed / pre-market gaps)
      if (open == null || high == null || low == null || close == null) {
        continue;
      }

      candles.push({
        time: timestamp[i],
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
      });
    }

    if (candles.length >= 50) return candles;
  }

  return buildSimulatedHistory(3300);
}

// Fallback when Yahoo Finance is unreachable
function buildSimulatedPrice(base: number): GoldPrice {
  const change = Math.round((Math.random() - 0.48) * 20 * 100) / 100;
  const price = base + change;
  const changePercent = Math.round((change / base) * 10000) / 100;
  return {
    price,
    change,
    changePercent,
    high: price + Math.abs(change) * 1.2,
    low: price - Math.abs(change) * 0.8,
    timestamp: Date.now(),
    trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

function buildSimulatedHistory(base: number): HistoricalPrice[] {
  const candles: HistoricalPrice[] = [];
  const now = Math.floor(Date.now() / 1000);
  let price = base;

  for (let i = 200; i >= 0; i--) {
    price = Math.max(base * 0.9, Math.min(base * 1.1, price + (Math.random() - 0.495) * 10));
    const h = price + Math.random() * 5;
    const l = price - Math.random() * 5;
    candles.push({
      time: now - i * 3600,
      open: Math.round((price + (Math.random() - 0.5) * 3) * 100) / 100,
      high: Math.round(h * 100) / 100,
      low: Math.round(l * 100) / 100,
      close: Math.round(price * 100) / 100,
    });
  }
  return candles;
}
