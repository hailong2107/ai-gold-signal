import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators, calculateIndicatorSeries } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
import { maybeSendAlerts } from "@/services/alerts";
import type { Timeframe } from "@/types";

export const dynamic = "force-dynamic";

const VALID_TIMEFRAMES: Timeframe[] = ["5M", "15M", "1H", "4H", "1D"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tf = (searchParams.get("timeframe") ?? "1H") as Timeframe;
  const timeframe = VALID_TIMEFRAMES.includes(tf) ? tf : "1H";

  try {
    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices(timeframe),
    ]);

    const indicators = calculateIndicators(history);
    const indicatorSeries = calculateIndicatorSeries(history);
    const signal = await analyzeWithGemini(price, indicators, timeframe);

    // Fire-and-forget — send Telegram immediately for BUY/SELL, don't block response
    if (signal.signal !== "HOLD") {
      void maybeSendAlerts(signal, price, indicators);
    }

    return NextResponse.json({ price, indicators, indicatorSeries, signal, history, timeframe });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze market" },
      { status: 500 }
    );
  }
}
