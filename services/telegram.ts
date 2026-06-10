import type { AISignal, GoldPrice } from "@/types";

interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

function buildMessage(
  signal: AISignal,
  price: GoldPrice,
  locale: "en" | "vi" = "en"
): string {
  const emoji =
    signal.signal === "BUY" ? "🟢" : signal.signal === "SELL" ? "🔴" : "🟡";

  if (locale === "vi") {
    const signalLabel =
      signal.signal === "BUY" ? "MUA" : signal.signal === "SELL" ? "BÁN" : "GIỮ LỆNH";
    const riskLabel =
      signal.risk === "Low" ? "Thấp" : signal.risk === "Medium" ? "Trung bình" : "Cao";

    let msg = `🚨 TÍN HIỆU VÀNG AI

${emoji} Tín hiệu: ${signalLabel}
💯 Độ tin cậy: ${signal.confidence}%
⚠️ Mức rủi ro: ${riskLabel}
🕐 Khung giờ: ${signal.timeframe}
💰 Giá vàng: $${price.price}`;

    if (signal.stopLoss) msg += `\n🛑 Cắt lỗ: $${signal.stopLoss}`;
    if (signal.takeProfit) msg += `\n🎯 Chốt lời: $${signal.takeProfit}`;

    msg += `\n\n📊 Phân tích AI:\n${signal.analysis}\n\n💡 Dành cho người mới:\n${signal.beginnerExplanation}`;
    msg += `\n\n🕐 ${new Date(signal.timestamp).toUTCString()}`;
    msg += `\n\n⚠️ Chỉ mang tính tham khảo — không phải lời khuyên tài chính.`;
    return msg;
  }

  let msg = `🚨 GOLD AI SIGNAL

${emoji} Signal: ${signal.signal}
💯 Confidence: ${signal.confidence}%
⚠️ Risk: ${signal.risk}
🕐 Timeframe: ${signal.timeframe}
💰 Price: $${price.price}`;

  if (signal.stopLoss) msg += `\n🛑 Stop Loss: $${signal.stopLoss}`;
  if (signal.takeProfit) msg += `\n🎯 Take Profit: $${signal.takeProfit}`;

  msg += `\n\n📊 AI Analysis:\n${signal.analysis}\n\n💡 For beginners:\n${signal.beginnerExplanation}`;
  msg += `\n\n🕐 ${new Date(signal.timestamp).toUTCString()}`;
  msg += `\n\n⚠️ Educational only — not financial advice.`;
  return msg;
}

async function sendMessage(creds: TelegramCredentials, text: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${creds.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: creds.chatId, text, parse_mode: "HTML" }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTelegramAlert(
  signal: AISignal,
  price: GoldPrice,
  options?: {
    botToken?: string | null;
    chatId?: string | null;
    locale?: "en" | "vi";
  }
): Promise<boolean> {
  const botToken = options?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options?.chatId ?? process.env.TELEGRAM_CHAT_ID;
  const locale = options?.locale ?? "en";

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured");
    return false;
  }

  return sendMessage(
    { botToken, chatId },
    buildMessage(signal, price, locale)
  );
}
