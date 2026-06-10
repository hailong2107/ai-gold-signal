import { createAdminClient } from "@/lib/supabase/admin";
import type { AISignal, GoldPrice, TechnicalIndicators } from "@/types";
import type { UserSettingsRow } from "@/types/database";

// ------- Writes (service role, called from cron / signal route) -------

export async function saveAiSignal(
  signal: AISignal,
  indicators: TechnicalIndicators,
  price: GoldPrice
): Promise<number | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("ai_signals")
    .insert({
      signal: signal.signal,
      confidence: signal.confidence,
      risk: signal.risk,
      analysis: signal.analysis,
      gold_price: price.price,
      rsi: indicators.rsi,
      ema20: indicators.ema20,
      ema50: indicators.ema50,
      macd: indicators.macd.macd,
      macd_signal: indicators.macd.signal,
      macd_histogram: indicators.macd.histogram,
      macd_crossover: indicators.macd.crossover,
    })
    .select("id")
    .single();

  if (error) {
    console.error("saveAiSignal error:", error.message);
    return null;
  }
  return data.id;
}

export async function saveGoldPrice(price: GoldPrice): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("gold_prices").insert({
    price: price.price,
    change: price.change,
    change_percent: price.changePercent,
    high: price.high,
    low: price.low,
    trend: price.trend,
  });
  if (error) console.error("saveGoldPrice error:", error.message);
}

export async function saveAlertHistory(
  userId: string,
  signalId: number | null,
  channel: string,
  success: boolean
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("alert_history").insert({
    user_id: userId,
    signal_id: signalId,
    channel,
    success,
  });
  if (error) console.error("saveAlertHistory error:", error.message);
}

// ------- Reads -------

export async function getAllAlertUsers(): Promise<UserSettingsRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("user_settings")
    .select("*")
    .eq("alerts_enabled", true);

  if (error) {
    console.error("getAllAlertUsers error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getUserSettings(
  userId: string
): Promise<UserSettingsRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<Omit<UserSettingsRow, "user_id" | "updated_at">>
): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.from("user_settings").upsert(
    {
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("upsertUserSettings error:", error.message);
    return false;
  }
  return true;
}

export async function getRecentSignals(limit = 20) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("ai_signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export async function getAlertHistory(userId: string, limit = 20) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("alert_history")
    .select("*, ai_signals(signal, confidence, gold_price)")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
