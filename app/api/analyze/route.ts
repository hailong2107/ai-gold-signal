import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices(),
    ]);

    const indicators = calculateIndicators(history);
    const signal = await analyzeWithGemini(price, indicators);

    return NextResponse.json({ price, indicators, signal, history });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze market" },
      { status: 500 }
    );
  }
}
