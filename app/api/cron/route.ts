import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
import { sendTelegramAlert } from "@/services/telegram";
import {
  saveAiSignal,
  saveGoldPrice,
  getAllAlertUsers,
  saveAlertHistory,
  getCronState,
  saveCronState,
} from "@/services/database";

export const dynamic = "force-dynamic";

// Minimum gap between alerts of the same signal type (1 hour)
const MIN_REPEAT_INTERVAL_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch market data + last cron state in parallel
    const [price, history, prevState] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices(),
      getCronState(),
    ]);

    const indicators = calculateIndicators(history);
    const signal = await analyzeWithGemini(price, indicators);

    // 2. Persist snapshot
    const [signalId] = await Promise.all([
      saveAiSignal(signal, indicators, price),
      saveGoldPrice(price),
    ]);

    // 3. Deduplication — decide whether to send an alert
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
    // Allow resending the same signal only after MIN_REPEAT_INTERVAL_MS
    const repeatAllowed = msSinceLastAlert >= MIN_REPEAT_INTERVAL_MS;

    const shouldAlert =
      (signalChanged ||
        newCrossover ||
        rsiBreakout) &&
      repeatAllowed;

    // 4. Fan-out to all subscribed users
    let alertsSent = 0;
    let alertSkipped = false;

    if (shouldAlert) {
      const alertUsers = await getAllAlertUsers();

      await Promise.all(
        alertUsers.map(async (userSettings) => {
          const meetsThreshold =
            signal.confidence >= userSettings.min_confidence ||
            (userSettings.alert_on_crossover && newCrossover) ||
            (userSettings.alert_on_rsi_breakout && rsiBreakout);

          if (!meetsThreshold) return;

          const success = await sendTelegramAlert(signal, price, {
            botToken: userSettings.telegram_bot_token,
            chatId: userSettings.telegram_chat_id,
          });

          await saveAlertHistory(
            userSettings.user_id,
            signalId,
            "telegram",
            success
          );

          if (success) alertsSent++;
        })
      );

      // 5. Update cron state so next run knows what was last sent
      await saveCronState({
        last_signal: signal.signal,
        last_crossover:
          indicators.macd.crossover !== "none"
            ? indicators.macd.crossover
            : prevState.last_crossover,
        last_alerted_at: alertsSent > 0 ? new Date().toISOString() : prevState.last_alerted_at,
      });
    } else {
      alertSkipped = true;
      // Still update last_signal so next run detects future changes correctly
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
      reason: alertSkipped
        ? `skipped — ${signalChanged ? "" : "no signal change, "}${!repeatAllowed ? `next alert in ${Math.round((MIN_REPEAT_INTERVAL_MS - msSinceLastAlert) / 60000)}min` : "conditions not met"}`
        : `sent (signalChanged=${signalChanged}, newCrossover=${newCrossover}, rsiBreakout=${rsiBreakout})`,
      alertsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
