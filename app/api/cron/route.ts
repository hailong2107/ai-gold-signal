import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
import { saveCommentary } from "@/services/commentary";
import { maybeSendAlerts } from "@/services/alerts";
import { saveAiSignal, saveGoldPrice, evaluateSignalOutcomes } from "@/services/database";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

    // Persist + commentary + alerts + news + outcome evaluation in parallel
    const [alertResult, , outcomesUpdated, newsResult] = await Promise.all([
      maybeSendAlerts(signal, price, indicators),              // 0
      saveCommentary(price, indicators),                        // 1
      evaluateSignalOutcomes(price.price),                      // 2
      fetch(`${BASE_URL}/api/news`, {                           // 3
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).then((r) => r.json()).catch(() => ({ count: 0 })),
      // HOLD skips saveAiSignal in maybeSendAlerts — save explicitly
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
      outcomesUpdated,
      newsCount: (newsResult as { count?: number }).count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
