import { createAdminClient } from "@/lib/supabase/admin";
import type { AISignal, GoldPrice, TechnicalIndicators } from "@/types";
import type { UserSettingsRow, UserPreferencesRow } from "@/types/database";

// ------- Cron deduplication state -------

export interface CronState {
  last_signal: string | null;
  last_crossover: string | null;
  last_alerted_at: string | null;
}

export async function getCronState(): Promise<CronState> {
  const db = createAdminClient();
  const { data } = await db
    .from("cron_state")
    .select("last_signal, last_crossover, last_alerted_at")
    .eq("id", 1)
    .single();
  return data ?? { last_signal: null, last_crossover: null, last_alerted_at: null };
}

export async function saveCronState(state: CronState): Promise<void> {
  const db = createAdminClient();
  await db.from("cron_state").upsert(
    { id: 1, ...state, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
}

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
      beginner_explanation: signal.beginnerExplanation,
      stop_loss: signal.stopLoss,
      take_profit: signal.takeProfit,
      timeframe: signal.timeframe,
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

// ------- User Preferences -------

export async function getUserPreferences(
  userId: string
): Promise<UserPreferencesRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function upsertUserPreferences(
  userId: string,
  prefs: Partial<Omit<UserPreferencesRow, "user_id" | "created_at" | "updated_at">>
): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.from("user_preferences").upsert(
    { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("upsertUserPreferences:", error.message);
    return false;
  }
  return true;
}

// ------- Signal history with stats -------

export async function getSignalHistory(limit = 50) {
  const db = createAdminClient();
  const { data } = await db
    .from("ai_signals")
    .select("id, signal, confidence, risk, gold_price, timeframe, stop_loss, take_profit, outcome, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function saveNewsSentiment(
  items: Array<{
    headline: string;
    source?: string;
    url?: string;
    sentiment: "bullish" | "bearish" | "neutral";
    summaryEn: string;
    summaryVi: string;
    impactScore: number;
  }>
): Promise<void> {
  const db = createAdminClient();
  await db.from("news_sentiment").insert(
    items.map((item) => ({
      headline: item.headline,
      source: item.source ?? null,
      url: item.url ?? null,
      sentiment: item.sentiment,
      summary_en: item.summaryEn,
      summary_vi: item.summaryVi,
      impact_score: item.impactScore,
    }))
  );
}

export async function getLatestNews(limit = 6) {
  const db = createAdminClient();
  const { data } = await db
    .from("news_sentiment")
    .select("*")
    .order("analyzed_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ------- Per-user alert preferences (include language for Telegram) -------

export async function getAllAlertUsersWithPrefs() {
  const db = createAdminClient();
  const { data } = await db
    .from("user_settings")
    .select("*, user_preferences!inner(language)")
    .eq("alerts_enabled", true);
  return data ?? [];
}
