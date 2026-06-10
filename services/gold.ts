import type { GoldPrice, HistoricalPrice, Timeframe } from "@/types";

const YAHOO_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const TICKER = "GC%3DF"; // GC=F — Gold futures
const HEADERS = { "User-Agent": "Mozilla/5.0" };

// Yahoo Finance interval / range mapping per timeframe
const TIMEFRAME_CONFIG: Record<
  Timeframe,
  { interval: string; range: string; resample?: number }
> = {
  "5M":  { interval: "5m",  range: "1d" },
  "15M": { interval: "15m", range: "5d" },
  "1H":  { interval: "1h",  range: "9d" },
  "4H":  { interval: "60m", range: "30d", resample: 4 }, // group 60m → 4H
  "1D":  { interval: "1d",  range: "1y" },
};

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
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 30 } });
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

  return buildSimulatedPrice(4150);
}

export async function fetchHistoricalPrices(
  timeframe: Timeframe = "1H"
): Promise<HistoricalPrice[]> {
  const { interval, range, resample } = TIMEFRAME_CONFIG[timeframe];
  const result = await fetchYahoo(interval, range);

  if (result) {
    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];
    const candles: HistoricalPrice[] = [];

    for (let i = 0; i < timestamp.length; i++) {
      const o = quote.open[i];
      const h = quote.high[i];
      const l = quote.low[i];
      const c = quote.close[i];
      if (o == null || h == null || l == null || c == null) continue;

      candles.push({
        time: timestamp[i],
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
      });
    }

    const merged = resample ? resampleCandles(candles, resample) : candles;
    if (merged.length >= 30) return merged;
  }

  return buildSimulatedHistory(4150, timeframe);
}

// Merge N consecutive 1H candles into one (e.g. 4H)
function resampleCandles(candles: HistoricalPrice[], n: number): HistoricalPrice[] {
  const result: HistoricalPrice[] = [];
  for (let i = 0; i + n <= candles.length; i += n) {
    const group = candles.slice(i, i + n);
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
    });
  }
  return result;
}

function buildSimulatedPrice(base: number): GoldPrice {
  const change = Math.round((Math.random() - 0.48) * 20 * 100) / 100;
  const price = base + change;
  return {
    price: Math.round(price * 100) / 100,
    change,
    changePercent: Math.round((change / base) * 10000) / 100,
    high: price + Math.abs(change) * 1.2,
    low: price - Math.abs(change) * 0.8,
    timestamp: Date.now(),
    trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

function buildSimulatedHistory(
  base: number,
  timeframe: Timeframe
): HistoricalPrice[] {
  const intervalSecs: Record<Timeframe, number> = {
    "5M": 300, "15M": 900, "1H": 3600, "4H": 14400, "1D": 86400,
  };
  const seconds = intervalSecs[timeframe];
  const candles: HistoricalPrice[] = [];
  const now = Math.floor(Date.now() / 1000);
  let price = base;

  for (let i = 200; i >= 0; i--) {
    price = Math.max(base * 0.9, Math.min(base * 1.1, price + (Math.random() - 0.495) * 10));
    candles.push({
      time: now - i * seconds,
      open: Math.round((price + (Math.random() - 0.5) * 3) * 100) / 100,
      high: Math.round((price + Math.random() * 5) * 100) / 100,
      low: Math.round((price - Math.random() * 5) * 100) / 100,
      close: Math.round(price * 100) / 100,
    });
  }
  return candles;
}
