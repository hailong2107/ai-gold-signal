import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getCachedSignal, setCachedSignal,
  getCachedCommentary, setCachedCommentary,
} from "@/lib/cache";
import type { GoldPrice, TechnicalIndicators, AISignal, Timeframe } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// Model fallback chain — try best models first, fall back automatically on rate limits.
// Gemma models (gemma-*) are free-tier with very generous quotas on Google AI Studio.
const GEMINI_MODELS = [
  "gemini-2.5-flash",      // best quality, rate-limited on free tier
  "gemini-2.0-flash",      // fast, good quality
  "gemma-4-31b-it",        // Gemma 4 31B — free, very generous quota
  "gemma-3-27b-it",        // Gemma 3 27B — free
  "gemini-1.5-flash",      // older Gemini, stable
  "gemini-1.5-flash-8b",   // lightest Gemini
  "gemma-3-12b-it",        // smallest free Gemma — last resort
] as const;

function isRateLimit(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  );
}

async function callGemini(prompt: string): Promise<string> {
  let lastErr: unknown;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      if (!isRateLimit(err)) throw err; // non-rate-limit errors — surface immediately
      // Rate limited — try next model in chain
    }
  }
  throw lastErr;
}

export async function analyzeWithGemini(
  price: GoldPrice,
  indicators: TechnicalIndicators,
  timeframe: Timeframe = "1H"
): Promise<AISignal> {
  // ── Cache check ──────────────────────────────────────────────────────
  const cached = await getCachedSignal<AISignal>(timeframe, price.price);
  if (cached) return cached;

  const prompt = `You are a professional gold (XAU/USD) market analyst. Analyze the data below and return a JSON trading signal.

Timeframe: ${timeframe}
Price: $${price.price} (${price.change >= 0 ? "+" : ""}${price.change}, ${price.changePercent}%)
Day High: $${price.high} | Day Low: $${price.low} | Trend: ${price.trend}

Technical Indicators:
- RSI(14): ${indicators.rsi}
- EMA20: $${indicators.ema20}
- EMA50: $${indicators.ema50}
- MACD: ${indicators.macd.macd} | Signal: ${indicators.macd.signal} | Histogram: ${indicators.macd.histogram}
- MACD Crossover: ${indicators.macd.crossover}

Rules:
1. NEVER predict exact future prices.
2. Be conservative and professional.
3. All analysis must be based on indicators, not guesswork.
4. Write analysis in clear professional English.
5. Write beginnerExplanation in plain English that a non-trader can understand.
6. Calculate realistic stopLoss and takeProfit based on risk level and price (use ATR-like logic with % of price).
   - Low risk: SL ~0.3%, TP ~0.6%
   - Medium risk: SL ~0.5%, TP ~1.0%
   - High risk: SL ~0.8%, TP ~1.5%
   - For BUY: SL below price, TP above price
   - For SELL: SL above price, TP below price
   - For HOLD: SL and TP are null

Respond ONLY with valid JSON:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "risk": "Low" | "Medium" | "High",
  "analysis": "2-3 sentence professional analysis",
  "beginnerExplanation": "1-2 sentence simple explanation for a beginner",
  "stopLoss": number | null,
  "takeProfit": number | null
}`;

  try {
    const text = await callGemini(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    const signal: AISignal = {
      signal: parsed.signal ?? "HOLD",
      confidence: Math.min(100, Math.max(0, parsed.confidence ?? 50)),
      risk: parsed.risk ?? "Medium",
      analysis: parsed.analysis ?? "Market conditions are mixed.",
      beginnerExplanation:
        parsed.beginnerExplanation ?? "The market is uncertain. No clear signal.",
      stopLoss: parsed.stopLoss ?? null,
      takeProfit: parsed.takeProfit ?? null,
      timeframe,
      timestamp: Date.now(),
    };

    await setCachedSignal(timeframe, price.price, signal);
    return signal;
  } catch {
    const fallback = buildFallbackSignal(price, indicators, timeframe);
    // Don't cache fallback — retry fresh on next request
    return fallback;
  }
}

export async function generateCommentary(
  price: GoldPrice,
  indicators: TechnicalIndicators
): Promise<{ en: string; vi: string; sentiment: "bullish" | "bearish" | "neutral" }> {
  // ── Cache check ──────────────────────────────────────────────────────
  const cached = await getCachedCommentary<{ en: string; vi: string; sentiment: "bullish" | "bearish" | "neutral" }>();
  if (cached) return cached;

  const prompt = `You are a senior gold market analyst. Write a short market commentary based on the data below.

Gold Price: $${price.price} (${price.changePercent >= 0 ? "+" : ""}${price.changePercent}%)
RSI: ${indicators.rsi} | EMA20: $${indicators.ema20} | EMA50: $${indicators.ema50}
MACD: ${indicators.macd.macd} | Crossover: ${indicators.macd.crossover}

Write commentary in BOTH English and Vietnamese. Keep each version to 2-3 sentences.
Vietnamese must sound natural — not robotic Google Translate.

Use these Vietnamese financial terms:
- Bullish momentum = Động lượng tăng giá
- Bearish pressure = Áp lực giảm giá
- Resistance = Kháng cự
- Support = Hỗ trợ
- Moving average = Đường trung bình động
- Overbought = Quá mua | Oversold = Quá bán

Respond ONLY with JSON:
{
  "en": "English commentary...",
  "vi": "Vietnamese commentary...",
  "sentiment": "bullish" | "bearish" | "neutral"
}`;

  try {
    const text = await callGemini(prompt);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");

    const parsed = JSON.parse(match[0]);
    const commentary = {
      en: parsed.en ?? "Market conditions are being monitored.",
      vi: parsed.vi ?? "Thị trường đang được theo dõi.",
      sentiment: parsed.sentiment ?? "neutral" as "bullish" | "bearish" | "neutral",
    };

    await setCachedCommentary(commentary);
    return commentary;
  } catch {
    return {
      en: "Gold is trading within its recent range. Monitor key support and resistance levels before entering any position.",
      vi: "Vàng đang giao dịch trong vùng giá gần đây. Hãy theo dõi các mức hỗ trợ và kháng cự quan trọng trước khi vào lệnh.",
      sentiment: indicators.macd.crossover === "bullish" ? "bullish" : indicators.macd.crossover === "bearish" ? "bearish" : "neutral",
    };
  }
}

// Chat responses are never cached — each is personalized
export async function generateChatResponse(
  message: string,
  context: {
    price: GoldPrice;
    indicators: TechnicalIndicators;
    signal: AISignal;
    locale: string;
  }
): Promise<string> {
  const isVi = context.locale === "vi";

  const prompt = `You are an AI Gold Trading Copilot. Be helpful, honest, and clear.
Current market data:
- Gold Price: $${context.price.price} (${context.price.changePercent}%)
- AI Signal: ${context.signal.signal} (${context.signal.confidence}% confidence, ${context.signal.risk} risk)
- RSI: ${context.indicators.rsi} | EMA20: $${context.indicators.ema20} | EMA50: $${context.indicators.ema50}
- MACD Crossover: ${context.indicators.macd.crossover}

IMPORTANT:
- Never promise profits or guarantee future prices.
- Always say signals are for educational purposes only.
- Keep answers concise (2-4 sentences max).
- Respond in ${isVi ? "Vietnamese (natural, not robotic)" : "English"}.

User: ${message}`;

  try {
    return await callGemini(prompt);
  } catch {
    return isVi
      ? "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại."
      : "Sorry, I couldn't process your request right now. Please try again.";
  }
}

export async function analyzeNewsSentiment(headlines: string[]): Promise<
  Array<{
    headline: string;
    sentiment: "bullish" | "bearish" | "neutral";
    summaryEn: string;
    summaryVi: string;
    impactScore: number;
  }>
> {
  const prompt = `Analyze these gold market headlines and classify their sentiment.

Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}

For each headline, provide:
- sentiment: "bullish", "bearish", or "neutral"
- summaryEn: 1-sentence English summary of impact on gold
- summaryVi: 1-sentence Vietnamese summary (natural language, not translated robotically)
- impactScore: 1-10 (how much this could affect gold price)

Respond ONLY with JSON array:
[
  {
    "index": 1,
    "sentiment": "bullish" | "bearish" | "neutral",
    "summaryEn": "...",
    "summaryVi": "...",
    "impactScore": 1-10
  }
]`;

  try {
    const text = await callGemini(prompt);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    return headlines.map((h, i) => {
      const item = parsed.find((p: { index: number }) => p.index === i + 1) ?? {};
      return {
        headline: h,
        sentiment: item.sentiment ?? "neutral",
        summaryEn: item.summaryEn ?? "",
        summaryVi: item.summaryVi ?? "",
        impactScore: item.impactScore ?? 5,
      };
    });
  } catch {
    return [];
  }
}

function buildFallbackSignal(
  price: GoldPrice,
  indicators: TechnicalIndicators,
  timeframe: Timeframe
): AISignal {
  let score = 0;
  if (indicators.rsi < 30) score += 2;
  else if (indicators.rsi < 45) score += 1;
  else if (indicators.rsi > 70) score -= 2;
  else if (indicators.rsi > 55) score -= 1;

  if (price.price > indicators.ema20) score += 1; else score -= 1;
  if (price.price > indicators.ema50) score += 1; else score -= 1;
  if (indicators.macd.crossover === "bullish") score += 2;
  else if (indicators.macd.crossover === "bearish") score -= 2;
  if (indicators.macd.histogram > 0) score += 1; else score -= 1;

  const signal: "BUY" | "SELL" | "HOLD" =
    score >= 3 ? "BUY" : score <= -3 ? "SELL" : "HOLD";

  const confidence = Math.min(90, 50 + Math.abs(score) * 8);
  const risk: "Low" | "Medium" | "High" =
    Math.abs(score) >= 4 ? "Low" : Math.abs(score) >= 2 ? "Medium" : "High";

  const pct = { Low: 0.003, Medium: 0.005, High: 0.008 }[risk];
  const tpPct = pct * 2;
  const sl = signal === "BUY"
    ? price.price * (1 - pct)
    : signal === "SELL" ? price.price * (1 + pct) : null;
  const tp = signal === "BUY"
    ? price.price * (1 + tpPct)
    : signal === "SELL" ? price.price * (1 - tpPct) : null;

  const analyses = {
    BUY: {
      analysis: `Gold is trading above EMA20 and EMA50 with ${indicators.macd.crossover === "bullish" ? "a bullish MACD crossover confirming" : "positive"} momentum. RSI at ${indicators.rsi} suggests room to move higher.`,
      beginnerExplanation: "Buyers are stronger than sellers right now. The trend indicators are pointing up.",
    },
    SELL: {
      analysis: `Gold has broken below key moving averages and momentum is weakening. RSI at ${indicators.rsi} suggests ${indicators.rsi > 70 ? "overbought conditions" : "bearish pressure"}.`,
      beginnerExplanation: "Sellers are stronger than buyers right now. The price trend is pointing down.",
    },
    HOLD: {
      analysis: "Gold is trading in a neutral zone with mixed signals from technical indicators. No clear directional bias.",
      beginnerExplanation: "The market has no clear direction right now. It's best to wait for a stronger signal.",
    },
  };

  return {
    signal,
    confidence,
    risk,
    ...analyses[signal],
    stopLoss: sl ? Math.round(sl * 100) / 100 : null,
    takeProfit: tp ? Math.round(tp * 100) / 100 : null,
    timeframe,
    timestamp: Date.now(),
  };
}
