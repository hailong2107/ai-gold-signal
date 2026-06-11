import { sendTelegramAlert } from "./telegram";
import {
  saveAiSignal,
  saveGoldPrice,
  saveAlertHistory,
  getAllAlertUsersWithPrefs,
  getCronState,
  saveCronState,
} from "./database";
import type { AISignal, GoldPrice, TechnicalIndicators } from "@/types";

// Minimum gap between repeated alerts for the SAME signal (30 min)
const MIN_REPEAT_INTERVAL_MS = 30 * 60 * 1000;

type AlertResult = {
  sent: number;
  reason: string | null;
  skipped: boolean;
};

/**
 * Check dedup rules and fan-out Telegram alerts to all subscribed users.
 * Safe to call fire-and-forget — never throws.
 */
export async function maybeSendAlerts(
  signal: AISignal,
  price: GoldPrice,
  indicators: TechnicalIndicators
): Promise<AlertResult> {
  try {
    // Only BUY / SELL trigger immediate alerts — HOLD is passive
    if (signal.signal === "HOLD") {
      // Still update cron_state so cron doesn't re-alert stale data
      const prev = await getCronState();
      await saveCronState({
        last_signal: "HOLD",
        last_crossover: prev.last_crossover,
        last_alerted_at: prev.last_alerted_at,
      });
      return { sent: 0, reason: "HOLD — no alert", skipped: true };
    }

    const [prevState, signalId] = await Promise.all([
      getCronState(),
      saveAiSignal(signal, indicators, price),
      saveGoldPrice(price),
    ]);

    const now = Date.now();
    const lastAlertedAt = prevState.last_alerted_at
      ? new Date(prevState.last_alerted_at).getTime()
      : 0;
    const msSinceLast = now - lastAlertedAt;

    const signalChanged = signal.signal !== prevState.last_signal;
    const newCrossover =
      indicators.macd.crossover !== "none" &&
      indicators.macd.crossover !== prevState.last_crossover;
    const rsiBreakout = indicators.rsi < 30 || indicators.rsi > 70;
    const cooldownOk = msSinceLast >= MIN_REPEAT_INTERVAL_MS;

    const shouldAlert = signalChanged || newCrossover || rsiBreakout || cooldownOk;

    if (!shouldAlert) {
      return { sent: 0, reason: "dedup — same signal within cooldown", skipped: true };
    }

    const alertUsers = await getAllAlertUsersWithPrefs();
    let sent = 0;

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
        if (success) sent++;
      })
    );

    await saveCronState({
      last_signal: signal.signal,
      last_crossover:
        indicators.macd.crossover !== "none"
          ? indicators.macd.crossover
          : prevState.last_crossover,
      last_alerted_at: sent > 0 ? new Date().toISOString() : prevState.last_alerted_at,
    });

    return { sent, reason: signalChanged ? "signal changed" : "fresh signal", skipped: false };
  } catch (err) {
    console.error("[alerts] maybeSendAlerts error:", err);
    return { sent: 0, reason: "error", skipped: true };
  }
}
