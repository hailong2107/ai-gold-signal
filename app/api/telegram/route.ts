import { NextResponse } from "next/server";
import { sendTelegramAlert } from "@/services/telegram";
import { getCronState, getAllAlertUsersWithPrefs } from "@/services/database";
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
  const [cronState, price, alertUsers] = await Promise.all([
    getCronState(),
    fetchGoldPrice().catch(() => null),
    getAllAlertUsersWithPrefs(),
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
    envConfig: {
      botTokenSet: Boolean(botToken),
      chatIdSet: Boolean(chatId),
      chatId: chatId ? `${chatId.slice(0, 6)}…` : null,
      configOk,
    },
    dbAlertUsers: {
      count: alertUsers.length,
      users: alertUsers.map((u) => ({
        userId: (u.user_id as string).slice(0, 8) + "…",
        alertsEnabled: u.alerts_enabled,
        hasBotToken: Boolean(u.telegram_bot_token),
        hasChatId: Boolean(u.telegram_chat_id),
        minConfidence: u.min_confidence,
        alertOnCrossover: u.alert_on_crossover,
        alertOnRsiBreakout: u.alert_on_rsi_breakout,
      })),
    },
    cronState,
    currentPrice: price?.price ?? null,
    testResult,
    diagnosis: alertUsers.length === 0 && configOk
      ? "DB has no alert users — will use env-level bot (fallback active)"
      : alertUsers.length === 0 && !configOk
        ? "❌ No DB users AND no env credentials — alerts cannot be sent"
        : `✅ ${alertUsers.length} user(s) configured in DB`,
    tip: `To send a test message: GET /api/telegram?secret=YOUR_CRON_SECRET&send=1`,
  });
}
