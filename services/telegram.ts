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

    let msg = `🚨 TÍN HIỆU VÀNG AI\n\n`;
    msg += `${emoji} Tín hiệu: ${signalLabel}\n`;
    msg += `💯 Độ tin cậy: ${signal.confidence}%\n`;
    msg += `⚠️ Mức rủi ro: ${riskLabel}\n`;
    msg += `🕐 Khung giờ: ${signal.timeframe}\n`;
    msg += `💰 Giá vàng: $${price.price}\n`;
    if (signal.stopLoss)   msg += `🛑 Cắt lỗ: $${signal.stopLoss.toFixed(2)}\n`;
    if (signal.takeProfit) msg += `🎯 Chốt lời: $${signal.takeProfit.toFixed(2)}\n`;
    msg += `\n📊 Phân tích AI:\n${signal.analysis}\n`;
    msg += `\n💡 Dành cho người mới:\n${signal.beginnerExplanation}\n`;
    msg += `\n🕐 ${new Date(signal.timestamp).toUTCString()}\n`;
    msg += `\n⚠️ Chỉ mang tính tham khảo — không phải lời khuyên tài chính.`;
    return msg;
  }

  let msg = `🚨 GOLD AI SIGNAL\n\n`;
  msg += `${emoji} Signal: ${signal.signal}\n`;
  msg += `💯 Confidence: ${signal.confidence}%\n`;
  msg += `⚠️ Risk: ${signal.risk}\n`;
  msg += `🕐 Timeframe: ${signal.timeframe}\n`;
  msg += `💰 Price: $${price.price}\n`;
  if (signal.stopLoss)   msg += `🛑 Stop Loss: $${signal.stopLoss.toFixed(2)}\n`;
  if (signal.takeProfit) msg += `🎯 Take Profit: $${signal.takeProfit.toFixed(2)}\n`;
  msg += `\n📊 AI Analysis:\n${signal.analysis}\n`;
  msg += `\n💡 For beginners:\n${signal.beginnerExplanation}\n`;
  msg += `\n🕐 ${new Date(signal.timestamp).toUTCString()}\n`;
  msg += `\n⚠️ Educational only — not financial advice.`;
  return msg;
}

async function sendMessage(creds: TelegramCredentials, text: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${creds.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No parse_mode — plain text avoids HTML/Markdown special-char rejections
        body: JSON.stringify({ chat_id: creds.chatId, text }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[telegram] sendMessage failed ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] sendMessage exception:", err);
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
    console.warn("[telegram] credentials missing — botToken or chatId not set");
    return false;
  }

  const text = buildMessage(signal, price, locale);
  const ok = await sendMessage({ botToken, chatId }, text);
  console.log(`[telegram] alert sent=${ok} signal=${signal.signal} chatId=${chatId.slice(0, 6)}...`);
  return ok;
}
