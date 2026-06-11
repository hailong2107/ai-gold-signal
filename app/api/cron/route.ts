import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
import { saveCommentary } from "@/services/commentary";
import { maybeSendAlerts } from "@/services/alerts";
import { saveAiSignal, saveGoldPrice } from "@/services/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices("1H"),
    ]);

    const indicators = calculateIndicators(history);
    const signal = await analyzeWithGemini(price, indicators, "1H");

    // Persist + commentary + alerts in parallel
    const [alertResult] = await Promise.all([
      maybeSendAlerts(signal, price, indicators),
      saveCommentary(price, indicators),
      // maybeSendAlerts already calls saveAiSignal + saveGoldPrice internally,
      // but for HOLD signals it skips those — save explicitly for HOLD
      ...(signal.signal === "HOLD"
        ? [saveAiSignal(signal, indicators, price), saveGoldPrice(price)]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      signal: signal.signal,
      confidence: signal.confidence,
      alertsSent: alertResult.sent,
      alertReason: alertResult.reason,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
