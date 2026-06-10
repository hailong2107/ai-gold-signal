import type { AISignal, GoldPrice } from "@/types";

interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

function buildMessage(signal: AISignal, price: GoldPrice): string {
  const emoji =
    signal.signal === "BUY" ? "🟢" : signal.signal === "SELL" ? "🔴" : "🟡";

  return `🚨 GOLD AI SIGNAL

${emoji} Signal: ${signal.signal}
💯 Confidence: ${signal.confidence}%
⚠️ Risk: ${signal.risk}
💰 Price: $${price.price}

📊 AI Analysis:
${signal.analysis}

🕐 ${new Date(signal.timestamp).toUTCString()}`;
}

async function sendMessage(
  creds: TelegramCredentials,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${creds.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: creds.chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Send using per-user credentials, with fallback to global env vars.
export async function sendTelegramAlert(
  signal: AISignal,
  price: GoldPrice,
  overrides?: { botToken?: string | null; chatId?: string | null }
): Promise<boolean> {
  const botToken = overrides?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = overrides?.chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured");
    return false;
  }

  return sendMessage({ botToken, chatId }, buildMessage(signal, price));
}
