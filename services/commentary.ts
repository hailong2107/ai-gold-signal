import { createAdminClient } from "@/lib/supabase/admin";
import { generateCommentary } from "./gemini";
import type { GoldPrice, TechnicalIndicators } from "@/types";
import type { Commentary } from "@/types";

export async function saveCommentary(
  price: GoldPrice,
  indicators: TechnicalIndicators
): Promise<Commentary | null> {
  const { en, vi, sentiment } = await generateCommentary(price, indicators);

  const db = createAdminClient();
  const { data, error } = await db
    .from("ai_commentary")
    .insert({
      content_en: en,
      content_vi: vi,
      sentiment,
      timeframe: "1H",
      gold_price: price.price,
    })
    .select()
    .single();

  if (error) {
    console.error("saveCommentary error:", error.message);
    return null;
  }

  return {
    id: data.id,
    contentEn: data.content_en,
    contentVi: data.content_vi,
    sentiment: data.sentiment ?? "neutral",
    goldPrice: data.gold_price ?? price.price,
    createdAt: data.created_at,
  };
}

export async function getLatestCommentary(): Promise<Commentary | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("ai_commentary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    contentEn: data.content_en,
    contentVi: data.content_vi,
    sentiment: data.sentiment ?? "neutral",
    goldPrice: data.gold_price ?? 0,
    createdAt: data.created_at,
  };
}
