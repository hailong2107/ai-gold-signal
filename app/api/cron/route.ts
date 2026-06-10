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
} from "@/services/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch market data
    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices(),
    ]);

    const indicators = calculateIndicators(history);

    // 2. Generate AI signal
    const signal = await analyzeWithGemini(price, indicators);

    // 3. Persist to database
    const [signalId] = await Promise.all([
      saveAiSignal(signal, indicators, price),
      saveGoldPrice(price),
    ]);

    // 4. Determine if this signal warrants an alert
    const isAlertWorthy =
      signal.confidence > 75 ||
      indicators.macd.crossover !== "none" ||
      indicators.rsi < 30 ||
      indicators.rsi > 70;

    // 5. Fan-out alerts to every user who has alerts enabled
    let alertsSent = 0;
    if (isAlertWorthy) {
      const alertUsers = await getAllAlertUsers();

      await Promise.all(
        alertUsers.map(async (userSettings) => {
          // Check user-specific thresholds
          const meetsThreshold =
            signal.confidence >= userSettings.min_confidence ||
            (userSettings.alert_on_crossover &&
              indicators.macd.crossover !== "none") ||
            (userSettings.alert_on_rsi_breakout &&
              (indicators.rsi < 30 || indicators.rsi > 70));

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
    }

    return NextResponse.json({
      success: true,
      signal: signal.signal,
      confidence: signal.confidence,
      signalId,
      isAlertWorthy,
      alertsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
