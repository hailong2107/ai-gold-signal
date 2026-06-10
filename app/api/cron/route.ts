import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
import { sendTelegramAlert } from "@/services/telegram";
import { saveCommentary } from "@/services/commentary";
import {
  saveAiSignal,
  saveGoldPrice,
  saveAlertHistory,
  getAllAlertUsersWithPrefs,
  getCronState,
  saveCronState,
} from "@/services/database";

export const dynamic = "force-dynamic";

const MIN_REPEAT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [price, history, prevState] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices("1H"),
      getCronState(),
    ]);

    const indicators = calculateIndicators(history);
    const signal = await analyzeWithGemini(price, indicators, "1H");

    // Persist signal + price + commentary in parallel
    const [signalId] = await Promise.all([
      saveAiSignal(signal, indicators, price),
      saveGoldPrice(price),
      saveCommentary(price, indicators),
    ]);

    // Deduplication logic
    const now = Date.now();
    const lastAlertedAt = prevState.last_alerted_at
      ? new Date(prevState.last_alerted_at).getTime()
      : 0;
    const msSinceLastAlert = now - lastAlertedAt;

    const signalChanged = signal.signal !== prevState.last_signal;
    const newCrossover =
      indicators.macd.crossover !== "none" &&
      indicators.macd.crossover !== prevState.last_crossover;
    const rsiBreakout = indicators.rsi < 30 || indicators.rsi > 70;
    const repeatAllowed = msSinceLastAlert >= MIN_REPEAT_INTERVAL_MS;

    const shouldAlert = (signalChanged || newCrossover || rsiBreakout) && repeatAllowed;

    let alertsSent = 0;

    if (shouldAlert) {
      const alertUsers = await getAllAlertUsersWithPrefs();

      await Promise.all(
        alertUsers.map(async (row) => {
          const prefs = (row as unknown as { user_preferences: { language: "en" | "vi" } | null })
            .user_preferences;
          const locale = prefs?.language ?? "en";

          const meetsThreshold =
            signal.confidence >= row.min_confidence ||
            (row.alert_on_crossover && newCrossover) ||
            (row.alert_on_rsi_breakout && rsiBreakout);

          if (!meetsThreshold) return;

          const success = await sendTelegramAlert(signal, price, {
            botToken: row.telegram_bot_token,
            chatId: row.telegram_chat_id,
            locale,
          });

          await saveAlertHistory(row.user_id, signalId, "telegram", success);
          if (success) alertsSent++;
        })
      );

      await saveCronState({
        last_signal: signal.signal,
        last_crossover:
          indicators.macd.crossover !== "none"
            ? indicators.macd.crossover
            : prevState.last_crossover,
        last_alerted_at: alertsSent > 0 ? new Date().toISOString() : prevState.last_alerted_at,
      });
    } else {
      await saveCronState({
        last_signal: signal.signal,
        last_crossover: prevState.last_crossover,
        last_alerted_at: prevState.last_alerted_at,
      });
    }

    return NextResponse.json({
      success: true,
      signal: signal.signal,
      confidence: signal.confidence,
      signalId,
      alertsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
