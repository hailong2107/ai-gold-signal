import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { analyzeWithGemini, generateChatResponse } from "@/services/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, locale = "en" } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices("1H"),
    ]);

    const indicators = calculateIndicators(history);
    const signal = await analyzeWithGemini(price, indicators, "1H");

    const reply = await generateChatResponse(message, {
      price,
      indicators,
      signal,
      locale,
    });

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
