import { RSI, EMA, MACD } from "technicalindicators";
import type { TechnicalIndicators, HistoricalPrice } from "@/types";

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
    const currentAbove =
      (latestMacd.MACD ?? 0) > (latestMacd.signal ?? 0);
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
