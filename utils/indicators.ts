import { RSI, EMA, MACD } from "technicalindicators";
import type { TechnicalIndicators, HistoricalPrice, IndicatorSeries } from "@/types";

export function calculateIndicators(
  prices: HistoricalPrice[]
): TechnicalIndicators {
  const closes = prices.map((p) => p.close);

  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const rsi = rsiValues[rsiValues.length - 1] ?? 50;

  const ema20Values = EMA.calculate({ values: closes, period: 20 });
  const ema20 = ema20Values[ema20Values.length - 1] ?? closes[closes.length - 1];

  const ema50Values = EMA.calculate({ values: closes, period: 50 });
  const ema50 = ema50Values[ema50Values.length - 1] ?? closes[closes.length - 1];

  const macdResult = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const latestMacd = macdResult[macdResult.length - 1];
  const prevMacd = macdResult[macdResult.length - 2];

  let crossover: "bullish" | "bearish" | "none" = "none";
  if (latestMacd && prevMacd) {
    const currentAbove = (latestMacd.MACD ?? 0) > (latestMacd.signal ?? 0);
    const prevAbove = (prevMacd.MACD ?? 0) > (prevMacd.signal ?? 0);
    if (currentAbove && !prevAbove) crossover = "bullish";
    else if (!currentAbove && prevAbove) crossover = "bearish";
  }

  return {
    rsi: Math.round(rsi * 100) / 100,
    ema20: Math.round(ema20 * 100) / 100,
    ema50: Math.round(ema50 * 100) / 100,
    macd: {
      macd: Math.round((latestMacd?.MACD ?? 0) * 100) / 100,
      signal: Math.round((latestMacd?.signal ?? 0) * 100) / 100,
      histogram: Math.round((latestMacd?.histogram ?? 0) * 100) / 100,
      crossover,
    },
  };
}

// Returns full time-series arrays for chart overlay
export function calculateIndicatorSeries(
  prices: HistoricalPrice[]
): IndicatorSeries {
  const closes = prices.map((p) => p.close);
  const times = prices.map((p) => p.time);

  // EMA20 — offset = 19
  const ema20Raw = EMA.calculate({ values: closes, period: 20 });
  const ema20Offset = closes.length - ema20Raw.length;
  const ema20 = ema20Raw.map((v, i) => ({
    time: times[ema20Offset + i],
    value: Math.round(v * 100) / 100,
  }));

  // EMA50 — offset = 49
  const ema50Raw = EMA.calculate({ values: closes, period: 50 });
  const ema50Offset = closes.length - ema50Raw.length;
  const ema50 = ema50Raw.map((v, i) => ({
    time: times[ema50Offset + i],
    value: Math.round(v * 100) / 100,
  }));

  // RSI14 — offset = 14
  const rsiRaw = RSI.calculate({ values: closes, period: 14 });
  const rsiOffset = closes.length - rsiRaw.length;
  const rsi = rsiRaw.map((v, i) => ({
    time: times[rsiOffset + i],
    value: Math.round(v * 100) / 100,
  }));

  // MACD(12,26,9) — offset = 33
  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const macdOffset = closes.length - macdRaw.length;
  const macd = macdRaw.map((v, i) => ({
    time: times[macdOffset + i],
    macd: Math.round((v.MACD ?? 0) * 100) / 100,
    signal: Math.round((v.signal ?? 0) * 100) / 100,
    histogram: Math.round((v.histogram ?? 0) * 100) / 100,
  }));

  return { ema20, ema50, rsi, macd };
}
