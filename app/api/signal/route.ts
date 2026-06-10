import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini } from "@/services/gemini";
import { sendTelegramAlert } from "@/services/telegram";
import {
  saveAiSignal,
  saveGoldPrice,
  getUserSettings,
  saveAlertHistory,
} from "@/services/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [price, history, userSettings] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices(),
      getUserSettings(user.id),
    ]);

    const indicators = calculateIndicators(history);
    const signal = await analyzeWithGemini(price, indicators);

    // Persist signal + price
    const [signalId] = await Promise.all([
      saveAiSignal(signal, indicators, price),
      saveGoldPrice(price),
    ]);

    // Send alert respecting user's own thresholds
    const minConf = userSettings?.min_confidence ?? 75;
    const shouldAlert =
      (userSettings?.alerts_enabled ?? true) &&
      (signal.confidence > minConf ||
        (userSettings?.alert_on_crossover && indicators.macd.crossover !== "none") ||
        (userSettings?.alert_on_rsi_breakout &&
          (indicators.rsi < 30 || indicators.rsi > 70)));

    let telegramSent = false;
    if (shouldAlert) {
      telegramSent = await sendTelegramAlert(signal, price, {
        botToken: userSettings?.telegram_bot_token,
        chatId: userSettings?.telegram_chat_id,
      });

      await saveAlertHistory(user.id, signalId, "telegram", telegramSent);
    }

    return NextResponse.json({
      price,
      indicators,
      signal,
      history,
      alert: { triggered: shouldAlert, telegramSent },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate signal" },
      { status: 500 }
    );
  }
}
