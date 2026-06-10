import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
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
    const signal = await analyzeWithGemini(price, indicators, timeframe);

    return NextResponse.json({ price, indicators, signal, history, timeframe });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze market" },
      { status: 500 }
    );
  }
}
