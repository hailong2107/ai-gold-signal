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

// Minimum gap between alerts for the SAME trigger (crossover/RSI), prevents back-to-back spam
const SAME_TRIGGER_COOLDOWN_MS = 30 * 60 * 1000; // 30 min

type AlertResult = {
  sent: number;
  reason: string;
  skipped: boolean;
};

/**
 * Check dedup rules and fan-out Telegram alerts to all subscribed users.
 * - HOLD signal → never sent
 * - Signal changed to BUY/SELL → always sent (no cooldown)
 * - Same signal but new MACD crossover or RSI breakout → sent if 30+ min since last alert
 * Safe to call fire-and-forget — never throws.
 */
export async function maybeSendAlerts(
  signal: AISignal,
  price: GoldPrice,
  indicators: TechnicalIndicators
): Promise<AlertResult> {
  try {
    // HOLD is passive — update state but never alert
    if (signal.signal === "HOLD") {
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
    const cooldownOk = msSinceLast >= SAME_TRIGGER_COOLDOWN_MS;

    const signalChanged =
      signal.signal !== prevState.last_signal &&
      (signal.signal === "BUY" || signal.signal === "SELL");

    const newCrossover =
      indicators.macd.crossover !== "none" &&
      indicators.macd.crossover !== prevState.last_crossover;

    const rsiBreakout = indicators.rsi < 30 || indicators.rsi > 70;

    // Signal change always fires immediately. Crossover/RSI fire only after cooldown.
    const shouldAlert =
      signalChanged ||
      (newCrossover && cooldownOk) ||
      (rsiBreakout && cooldownOk);

    const reason = signalChanged
      ? `signal changed ${prevState.last_signal ?? "null"} → ${signal.signal}`
      : newCrossover
        ? `MACD ${indicators.macd.crossover} crossover`
        : rsiBreakout
          ? `RSI breakout (${indicators.rsi})`
          : "no trigger";

    console.log(`[alerts] shouldAlert=${shouldAlert} reason="${reason}" cooldownOk=${cooldownOk}`);

    if (!shouldAlert) {
      // Still update last_signal so next change is detected
      await saveCronState({
        last_signal: signal.signal,
        last_crossover: prevState.last_crossover,
        last_alerted_at: prevState.last_alerted_at,
      });
      return { sent: 0, reason, skipped: true };
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

    console.log(`[alerts] sent=${sent} reason="${reason}"`);
    return { sent, reason, skipped: false };
  } catch (err) {
    console.error("[alerts] maybeSendAlerts error:", err);
    return { sent: 0, reason: `error: ${err}`, skipped: true };
  }
}
