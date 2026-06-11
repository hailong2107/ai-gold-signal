import { NextResponse } from "next/server";
import { sendTelegramAlert } from "@/services/telegram";
import { getCronState } from "@/services/database";
import { fetchGoldPrice } from "@/services/gold";
import type { AISignal, GoldPrice } from "@/types";

// POST — send alert with explicit signal + price (from settings UI)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signal, price } = body as { signal: AISignal; price: GoldPrice };

    if (!signal || !price) {
      return NextResponse.json({ error: "Missing signal or price data" }, { status: 400 });
    }

    const sent = await sendTelegramAlert(signal, price);
    return NextResponse.json({ success: sent });
  } catch {
    return NextResponse.json({ error: "Failed to send Telegram alert" }, { status: 500 });
  }
}

// GET — diagnostic: show cron_state + send a real test message to the configured bot
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization");

  // Auth: require CRON_SECRET or a ?secret= param for quick browser testing
  const secret = searchParams.get("secret") ?? authHeader?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read current state
  const [cronState, price] = await Promise.all([
    getCronState(),
    fetchGoldPrice().catch(() => null),
  ]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const configOk = Boolean(botToken && chatId);

  // Optionally send a test message
  let testResult: { sent: boolean; error?: string } | null = null;
  if (searchParams.get("send") === "1" && price) {
    const testSignal: AISignal = {
      signal: "BUY",
      confidence: 99,
      risk: "Low",
      analysis: "This is a test message from the Gold AI Signal system. If you see this, Telegram alerts are working correctly.",
      beginnerExplanation: "Đây là tin nhắn test — hệ thống Telegram hoạt động bình thường.",
      stopLoss: price.price * 0.995,
      takeProfit: price.price * 1.01,
      timeframe: "1H",
      timestamp: Date.now(),
    };

    try {
      const ok = await sendTelegramAlert(testSignal, price, {
        botToken: botToken ?? undefined,
        chatId: chatId ?? undefined,
        locale: "vi",
      });
      testResult = { sent: ok };
    } catch (err) {
      testResult = { sent: false, error: String(err) };
    }
  }

  return NextResponse.json({
    config: {
      botTokenSet: Boolean(botToken),
      chatIdSet: Boolean(chatId),
      chatId: chatId ? `${chatId.slice(0, 4)}****` : null,
      configOk,
    },
    cronState,
    currentPrice: price?.price ?? null,
    testResult,
    tip: configOk
      ? `To send a test message: GET /api/telegram?secret=YOUR_CRON_SECRET&send=1`
      : "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your environment",
  });
}
